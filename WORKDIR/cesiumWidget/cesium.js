
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
        animation: true,
        baseLayerPicker: false,
        navigationHelpButton: true,
        navigationInstructionsInitiallyVisible: false,
        sceneModePicker: false,
        homeButton: true,
        geocoder: false,
        fullscreenButton: true,
        fullscreenElement: div,
        timeline: true,
        baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
            credit: new Cesium.Credit("OpenStreetMap", true)
        })),
        // large negative value to render large underground structures
        depthPlaneEllipsoidOffset: -50000.0,
    });


    viewer.animation.viewModel.dateFormatter = function(date, viewModel) {
        return "the date";
    }

    viewer.animation.viewModel.timeFormatter = function(date, viewModel) {
        return "Oakley was here";
    }

    Cesium.Timeline.prototype.makeLabel = function (time) {
        const localDate = Cesium.JulianDate.toDate(time);
        return "oakley";
      };

   //   console.log(viewer.camera.frustum);

    //    viewer.camera.frustum.near = 1e-9;
    //    viewer.camera.frustum.far = 500000000000;
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
    });
    viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
        function(e) {
            e.cancel = true;
            viewer.scene.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
            });
        }
    )
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    // setting to 2.5D because rendering and navigation is confusing and buggy in 3D
  //  viewer.scene.mode = Cesium.SceneMode.COLUMBUS_VIEW;
  viewer.scene.mode = Cesium.SceneMode.SCENE3D;

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

    // this works for 2.5D
    // Cesium.EllipsoidalOccluder.prototype.isScaledSpacePointVisible = function (
    //     occludeeScaledSpacePosition
    //   ) {
    //     return isScaledSpacePointVisible(
    //       occludeeScaledSpacePosition,
    //       this._cameraPositionInScaledSpace,
    //       this._distanceToLimbInScaledSpaceSquared
    //     );
    //   };

    el.appendChild(div);

    function fullScreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            div.requestFullscreen();
        }
    }
    const full = document.createElement("button");
    full.innerHTML = "fullscreen";
    full.addEventListener("click", fullScreen, false);
    div.appendChild(full);
}


export default { render };
