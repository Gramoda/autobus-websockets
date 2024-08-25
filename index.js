import express from "express"
import {readFile} from "node:fs/promises"
import path, { dirname, join } from "node:path";
import url from "node:url"
import { DateTime, Duration } from "luxon";
import { WebSocketServer } from "ws";

const port = 3000;
const timeZone = "Europe/Moscow";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__filename, __dirname);

const loadBuses = async () => {
  const data = await readFile(path.join(__dirname, "buses.json"), "utf-8");
  return JSON.parse(data);
}

const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
  const now = DateTime.now().setZone(timeZone);
  const [hours, minutes] = firstDepartureTime.split(":").map(Number);


  let departure = DateTime.now().set({hours,minutes, seconds: 0, millisecond:0}).setZone(timeZone);
  let checkDeparture = DateTime.now().set({hours,minutes, seconds: 0, millisecond:0}).setZone(timeZone);
  
  const endOfDay = DateTime.now().set({hours:23,minutes:59, seconds: 59}).setZone(timeZone)

  while (now > departure) {
    departure = departure.plus({minutes: frequencyMinutes})
    checkDeparture = checkDeparture.plus({days:1});
    if ((departure > endOfDay) && (departure < checkDeparture)) {
      departure = checkDeparture;
    }

  }

  return departure;
} 

const sortBuses = (buses) => {
  return [...buses].sort((a, b) => {
    const aDateTime = DateTime.fromISO(`${a.nextDeparture.date}T${a.nextDeparture.time}`);
    const bDateTime = DateTime.fromISO(`${b.nextDeparture.date}T${b.nextDeparture.time}`);
    return aDateTime.toMillis() - bDateTime.toMillis();
  });
}

const sendUpdatedData = async() => {
  const buses = await loadBuses();
  

  const updatedBuses = buses.map(bus => {
    const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);

    const now = DateTime.now().setZone(timeZone);
    
    const timeRemaning = Duration.fromMillis(nextDeparture.diff(now).toMillis());
   
    let time = 0;
    if (timeRemaning.values.milliseconds < 60000) {
      time = "Автобус отправляется"
    } else {
      time = timeRemaning.toFormat("hh:mm:ss");
    }

    
    return {...bus, nextDeparture: { 
      date:nextDeparture.toFormat('yyyy-MM-dd'),
      time:nextDeparture.toFormat('HH:mm:ss'),
      remaning:time,
      
    }}
  })

  return updatedBuses;
}

const app = express();

app.use(express.static(path.join(__dirname,"public")));


app.get('/next-departure',async (req,res) => {
  try {
    const updatedData = await sendUpdatedData();
    const sortedData  = sortBuses(updatedData);
    console.log(sortedData);
    res.json(sortedData);
  } catch {
    res.send('error')
  }
})

const wss = new WebSocketServer({ noServer: true});
const clients = new Set();

wss.on("connection", (ws) => {
  console.log('WebSocket connection');
  clients.add(ws);

  const sendUpdates = async () => {
    try {
      const updatedBuses = await sendUpdatedData();
      const sortedBuses = sortBuses(updatedBuses);

      ws.send(JSON.stringify(sortedBuses));
    } catch (error){
      console.log('websocket error ', error);
    }
  }

  const intervalId = setInterval(sendUpdates,1000);


  ws.on('close', ()=> {
    clearInterval(intervalId);
    clients.delete(ws);
    console.log('Websocket closed')
  })
});

const server = app.listen(port , () => {
  console.log('Server running on http://localhost:' + port)
})

server.on('upgrade', (req,socket, head,) => {
  wss.handleUpgrade(req,socket, head, (ws) => {
    wss.emit('connection',ws,req);
  })
})

