import express from "express"
import {readFile} from "node:fs/promises"
import path, { dirname, join } from "node:path";
import url from "node:url"
import { DateTime } from "luxon";

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



const sendUpdatedData = async() => {
  const buses = await loadBuses();
  

  const updatedBuses = buses.map(bus => {
    const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);
    console.log(nextDeparture)
    return {...bus, nextDeparture: { 
      data:nextDeparture.toFormat('yyyy-MM-dd'),
      time:nextDeparture.toFormat('HH:mm:ss'),
    }}
  })

  return updatedBuses;
}


const app = express();
app.get('/next-departure',async (req,res) => {
  try {
    const updatedData = await sendUpdatedData();
    res.json(updatedData);
  } catch {
    res.send('error')
  }
})

app.listen(port , () => {
  console.log('Server running on http://localhost:' + port)
})

