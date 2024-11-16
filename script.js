// Inicializa o mapa e define a visualização inicial
const map = L.map("map").setView([38.72, -9.39], 13);
let speciesChart; // Variável global para o gráfico
let stateChart;

L.tileLayer(
  "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
  {
    attribution:
      '&copy; <a href="https://carto.com/attributions">CartoDB</a> contributors',
  }
).addTo(map);

// Controle de zoom personalizado
map.zoomControl.remove();
L.control.zoom({ position: "topright" }).addTo(map);

// Configura o grupo de clusters
const markers = L.markerClusterGroup();

// Carrega o GeoJSON e adiciona ao mapa
fetch("trees.geojson")
  .then((response) => response.json())
  .then((data) => {
    const geoJsonLayer = L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        const properties = feature.properties;
        const popupContent = `
          <div class="popup-content">
            <strong>Rua:</strong> ${properties.rua || "N/A"}<br>
            <strong>Local:</strong> ${properties.local || "N/A"}<br>
            <strong>Freguesia:</strong> ${properties.freguesia || "N/A"}<br>
            <strong>Espécie:</strong> ${properties.especie || "N/A"}<br>
            <strong>Nome Científico:</strong> ${
              properties.nome_cien3 || "N/A"
            }<br>
            <strong>Estado:</strong> ${properties.estado || "N/A"}<br>
            <strong>Caldeira:</strong> ${properties.caldeira || "N/A"}<br>
            <strong>Tutor:</strong> ${properties.tutor || "N/A"}<br>
            <strong>Gestor:</strong> ${properties.gestor || "N/A"}<br>
            <strong>Data Atualização:</strong> ${
              new Date(properties.data_actu8).toLocaleDateString() || "N/A"
            }<br>
          </div>
        `;
        layer.bindPopup(popupContent);
      },
    });
    markers.addLayer(geoJsonLayer); // Adiciona o GeoJSON ao grupo de clusters
    map.addLayer(markers); // Adiciona o grupo de clusters ao mapa
  })
  .catch((error) =>
    console.error("Erro ao carregar o arquivo GeoJSON:", error)
  );

// Adicionar o controle de desenho
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Inicializar o controle de desenho com edição limitada
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    edit: false,
    remove: true, // Ativa a remoção de polígonos, mas sem o menu avançado
  },
  draw: {
    polygon: false,
    polyline: false,
    rectangle: true,
    circle: false,
    circlemarker: false,
    marker: false,
  },
});

// Adiciona o controle de desenho ao mapa
map.addControl(drawControl);

// Função para remover todos os polígonos no mapa
function removeAllPolygons() {
  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      drawnItems.removeLayer(layer);
    }
  });
  updateTreeCount(); // Atualiza a contagem de árvores
}

// Evento para iniciar o processo de exclusão diretamente ao clicar na lixeira
map.on("draw:deletestart", () => {
  removeAllPolygons(); // Remove qualquer polígono existente antes de começar a desenhar um novo
  map.fire("draw:deletestop");
});

// Evento para adicionar um polígono ao mapa após ser desenhado
map.on(L.Draw.Event.CREATED, (event) => {
  const layer = event.layer;
  drawnItems.addLayer(layer);

  // Atualiza a contagem com o novo polígono
  updateTreeCount();
});

// Evento para apagar o polígono ao clicar na lixeira diretamente, sem submenu
map.on("draw:deleted", removeAllPolygons);

// Função para atualizar a contagem de árvores visíveis
function updateTreeCount() {
  const box = document.querySelector(".box-1");
  let treeCount = 0;
  let polygonLayer = null;

  // Verifica se existe um polígono desenhado e define o polygonLayer
  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      polygonLayer = layer;
    }
  });

  // Percorre cada árvore no grupo de clusters
  markers.eachLayer((marker) => {
    const isVisible = map.getBounds().contains(marker.getLatLng());

    // Verifica se a árvore está visível e, se houver um polígono, se está dentro dele
    if (isVisible) {
      if (polygonLayer) {
        const isInsidePolygon = pointInPolygon(
          marker.getLatLng(),
          polygonLayer
        );
        if (isInsidePolygon) {
          treeCount++;
        }
      } else {
        // Se não houver polígono, conta apenas as árvores visíveis
        treeCount++;
      }
    }
  });

  box.innerHTML = ` <small>Number of trees</small><p><span class="tree-count">${treeCount}</span></p>`;
}
// Função para atualizar o gráfico na box-2
function updateSpeciesChart() {
  const speciesCounts = {}; // Objeto para contar as espécies
  let polygonLayer = null;

  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      polygonLayer = layer;
    }
  });

  markers.eachLayer((marker) => {
    const markerLatLng = marker.getLatLng();
    const isVisible = map.getBounds().contains(markerLatLng);
    const species = marker.feature?.properties?.nome_cien3 || "Unknown";

    if (isVisible) {
      if (polygonLayer) {
        const isInsidePolygon = pointInPolygon(markerLatLng, polygonLayer);
        if (isInsidePolygon) {
          speciesCounts[species] = (speciesCounts[species] || 0) + 1;
        }
      } else {
        speciesCounts[species] = (speciesCounts[species] || 0) + 1;
      }
    }
  });

  const labels = Object.keys(speciesCounts);
  const data = Object.values(speciesCounts);

  if (speciesChart) {
    speciesChart.data.labels = labels;
    speciesChart.data.datasets[0].data = data;
    speciesChart.update();
  } else {
    const ctx = document.getElementById("speciesChart").getContext("2d");
    speciesChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
              "#E91E63",
              "#8BC34A",
              "#FFC107",
              "#03A9F4",
              "#9C27B0",
              "#CDDC39",
              "#00BCD4",
              "#FF5722",
              "#607D8B",
              "#795548",
              "#673AB7",
              "#2196F3",
              "#4CAF50",
              "#F44336",
              "#FF9800",
              "#3F51B5",
              "#009688",
              "#FFEB3B",
              "#B39DDB",
              "#FF8A65",
              "#AED581",
              "#81D4FA",
              "#CE93D8",
              "#FFCC80",
              "#A1887F",
              "#90A4AE",
              "#C5E1A5",
              "#FFAB91",
              "#B3E5FC",
              "#D1C4E9",
              "#F8BBD0",
              "#DCEDC8",
              "#B2DFDB",
              "#FFCDD2",
              "#E6EE9C",
              "#FFF9C4",
              "#FFE082",
              "#D7CCC8",
              "#B0BEC5",
              "#F06292",
              "#BA68C8",
              "#64B5F6",
              "#4DB6AC",
              "#81C784",
            ],
            borderColor: "#FFFFFF",
            borderWidth: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
          },
        },
      },
    });
  }
}

function updateStateChart() {
  const stateCounts = {}; // Objeto para contar os estados
  let polygonLayer = null;

  // Verifica se existe um polígono desenhado
  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      polygonLayer = layer;
    }
  });

  // Itera sobre cada marcador no cluster
  markers.eachLayer((marker) => {
    const markerLatLng = marker.getLatLng();
    const isVisible = map.getBounds().contains(markerLatLng);
    const state = marker.feature?.properties?.estado || "Unknown";

    if (isVisible) {
      if (polygonLayer) {
        const isInsidePolygon = pointInPolygon(markerLatLng, polygonLayer);
        if (isInsidePolygon) {
          stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
      } else {
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      }
    }
  });

  const labels = Object.keys(stateCounts);
  const data = Object.values(stateCounts);

  // Atualiza ou cria o gráfico
  if (stateChart) {
    stateChart.data.labels = labels;
    stateChart.data.datasets[0].data = data;
    stateChart.update();
  } else {
    const ctx = document.getElementById("stateChart").getContext("2d");
    stateChart = new Chart(ctx, {
      type: "doughnut", // Gráfico de barras
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
            borderColor: "#FFFFFF", // Bordas brancas
            borderWidth: 0.1, // Largura das bordas
          },
        ],
      },
      options: {
        responsive: true,

        indexAxis: "y", // Barras horizontais
        plugins: {
          legend: {
            display: false, // Remove a legenda
          },
          tooltip: {
            enabled: true, // Exibe os dados ao passar o mouse
          },
        },
        scales: {
          x: {
            display: false, // Oculta os rótulos no eixo X
          },
          y: {
            display: false, // Oculta os rótulos no eixo Y
          },
        },
      },
    });
  }
}
// Função para verificar se um ponto está dentro de um polígono
function pointInPolygon(point, polygon) {
  const x = point.lng,
    y = point.lat;
  let inside = false;

  const polyPoints = polygon.getLatLngs()[0]; // Coordenadas do polígono

  for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
    const xi = polyPoints[i].lng,
      yi = polyPoints[i].lat;
    const xj = polyPoints[j].lng,
      yj = polyPoints[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Atualiza a contagem de árvores ao mover ou dar zoom no mapa
map.on("moveend", () => {
  updateTreeCount();
  updateSpeciesChart();
  updateStateChart(); // Atualiza o gráfico de estados
});

map.on(L.Draw.Event.CREATED, (event) => {
  const layer = event.layer;
  drawnItems.addLayer(layer);
  updateTreeCount();
  updateSpeciesChart();
  updateStateChart();
});

map.on("draw:deleted", () => {
  updateTreeCount();
  updateSpeciesChart();
  updateStateChart();
});

// Atualização inicial ao carregar o mapa
updateTreeCount();
updateSpeciesChart();
updateStateChart();
