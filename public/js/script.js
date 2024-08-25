const fetchBusData = async() => {
  try {
    const response = await fetch("/next-departure");

    if (!response.ok) {
      throw new Error(`HTTP error status :${response.status}`)
    }

    const buses = response.json();

    return buses;
  } catch (error) {
    console.error("error fetching",error);
  }
}

const formatDate = (date) => date.toISOString().split("T")[0];
const formatTime = (date) => date.toISOString().split("T")[1].slice(0, 5);


const renderTable = (buses) => {
  const tableBody = document.querySelector('#bus tbody');
  tableBody.textContent = ""; // Очищаем тело таблицы

  buses.forEach(bus => {
    const row = document.createElement("tr");

   
    const nextDepartureDateTimeUTC = new Date(
      `${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`
    );

    row.innerHTML = `
      <td>${bus.busNumber}</td>
      <td>${bus.startPoint} - ${bus.endPoint}</td>
      <td>${formatDate(nextDepartureDateTimeUTC)}</td>
      <td>${formatTime(nextDepartureDateTimeUTC)}</td>
      <td>${bus.nextDeparture.remaning}</td>
    `;

    tableBody.append(row); 
  });
}

const initWebSocket = () => {
  const ws = new WebSocket(`ws://${location.host}`)

  ws.addEventListener ("open", () => {
    console.log("Websocket connection");

  })

  ws.addEventListener("message", (event) => {
    const buses = JSON.parse(event.data);
    renderTable(buses);
  })

  ws.addEventListener("error", (event) => {
    console.log("error");
  })

  ws.addEventListener("close", (event) => {
    console.log("Websocket connection close");
  })
}

const init = async() => {
  const buses = await fetchBusData();
  renderTable(buses);

  initWebSocket();
}

init()