
function loadScript(src) {
    return new Promise((resolve, reject) => {
        let script = Object.assign(document.createElement("script"), {
            type: "text/javascript",
            async: true,
            src: src,
        });
        script.addEventListener("load", resolve);
        script.addEventListener("error", reject);
        document.body.appendChild(script);
    });
}

await loadScript("https://cesium.com/downloads/cesiumjs/releases/1.116/Build/Cesium/Cesium.js");

function render({ model, el }) {
    let width = model.get("width");
    let height = model.get("height");

    console.log(width);
    console.log(height);

    const div = document.createElement("div");
    div.id = "cesiumContainer";
    div.style.width = width;
    div.style.height = height;


    const key = '1GtAyVRS3FCxxi0NJdw4';
    const viewer = new Cesium.Viewer(div, {
        animation: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        sceneModePicker: true,
        homeButton: false,
        geocoder: false,
        fullscreenButton: true,
        timeline: false,
        terrain: new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromUrl(`https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=${key}`, {
            credit: new Cesium.Credit("\u003ca href=\"https://www.maptiler.com/copyright/\" target=\"_blank\"\u003e\u0026copy;MapTiler\u003c/a\u003e \u003ca href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\"\u003e\u0026copy; OpenStreetMap contributors\u003c/a\u003e", true),
            requestVertexNormals: true
        })),
        // Use OpenStreetMaps
        // *     baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
        // *       url: "https://tile.openstreetmap.org/"
        // *     })),
        baseLayer: new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${key}`,
            minimumLevel: 0,
            maximumLevel: 20,
            tileWidth: 512,
            tileHeight: 512,
            credit: new Cesium.Credit("\u003ca href=\"https://www.maptiler.com/copyright/\" target=\"_blank\"\u003e\u0026copy; MapTiler\u003c/a\u003e \u003ca href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\"\u003e\u0026copy; OpenStreetMap contributors\u003c/a\u003e", true)
        })),
    });
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 4500),
        // orientation: {
        //     pitch: Cesium.Math.toRadians(-20)
        // }
    });
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    // setting to 2.5D because rendering and navigation is confusing and buggy in 3D
    viewer.scene.mode = Cesium.SceneMode.COLUMBUS_VIEW;

    if (model.get("geojson").length > 0) {
        const geojson = JSON.parse(model.get("geojson"));

        // Cesium expects elevation in meters
        for (const feature of geojson.features) {
            const coords = feature.geometry.coordinates[0];
            for (var i = 0; i < coords.length; i++) {
                const [lon, lat, ele] = coords[i];
                coords[i] = [lon, lat, ele * -1000];
            }
        }


        viewer.dataSources.add(Cesium.GeoJsonDataSource.load(geojson));
    }

    //    viewer.dataSources.add(Cesium.GeoJsonDataSource.load(geojson));
    el.appendChild(div);

    console.log(div);

    // //-----------
    //   let button = document.createElement("button");
    //   button.innerHTML = `count is ${model.get("value")}`;
    //   button.addEventListener("click", () => {
    //     model.set("value", model.get("value") + 1);
    //     model.save_changes();
    //   });
    //   model.on("change:value", () => {
    //     button.innerHTML = `count is ${model.get("value")}`;
    //   });
    //   el.appendChild(button);
}


export default { render };
