async function loadData() {
  const res = await fetch("/api/bosses");
  const data = await res.json();
  bosses = data;
  render();
}

let bosses = [];
let interval;

document.getElementById("addBoss").addEventListener("click", async () => {
  const name = document.getElementById("bossName").value.trim();
  const seconds = parseInt(document.getElementById("timer").value);

  if (!name || isNaN(seconds)) return alert("Enter name and timer!");

  const boss = {
    name,
    timer: seconds,
    endTime: Date.now() + seconds * 1000,
    spawned: false,
  };

  await fetch("/api/bosses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(boss),
  });

  loadData();
});

function render() {
  const activeTable = document.querySelector("#activeTable tbody");
  const spawnedTable = document.querySelector("#spawnedTable tbody");
  activeTable.innerHTML = "";
  spawnedTable.innerHTML = "";

  bosses.forEach((b) => {
    const remaining = Math.max(0, Math.floor((b.endTime - Date.now()) / 1000));
    if (remaining <= 0 && !b.spawned) {
      b.spawned = true;
      b.spawnedAt = new Date().toLocaleTimeString();
      fetch("/api/bosses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
    }

    if (!b.spawned) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${b.name}</td>
        <td>${remaining}s</td>
        <td><button onclick="deleteBoss('${b.name}')">Delete</button></td>
      `;
      activeTable.appendChild(row);
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${b.name}</td><td>${b.spawnedAt}</td>`;
      spawnedTable.appendChild(row);
    }
  });
}

async function deleteBoss(name) {
  await fetch(`/api/bosses/${name}`, { method: "DELETE" });
  loadData();
}

function startTimer() {
  if (interval) clearInterval(interval);
  interval = setInterval(() => render(), 1000);
}

loadData();
startTimer();
