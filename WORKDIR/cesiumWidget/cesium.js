
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

    const div = document.createElement("div");
    div.id = "cesiumContainer";
    div.style.width = model.get("width");
    div.style.height = model.get("height");


    const viewer = new Cesium.Viewer(div, {
        animation: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        sceneModePicker: true,
        homeButton: false,
        geocoder: false,
        fullscreenButton: true,
        timeline: false,
        baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
            credit: new Cesium.Credit("OpenStreetMap", true)
        })),
    });
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 4500),
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


    model.on("msg:custom", (msg) => {
        if (msg?.geojson) {
            const geojson = msg.geojson;

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
    });

    el.appendChild(div);
}


export default { render };
