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

await loadScript("https://js.arcgis.com/4.30/");

function render({ model, el }) {

    const div = document.createElement("div");
    div.id = "cesiumContainer";
    div.style.width = model.get("width");
    div.style.height = model.get("height");

    const geojson = model.get("geojson");

    require([
        "esri/views/MapView",
        "esri/views/SceneView",
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/renderers/SimpleRenderer",
        "esri/symbols/CIMSymbol",
        "esri/symbols/PolygonSymbol3D",
        "esri/widgets/AreaMeasurement2D",
        "esri/widgets/AreaMeasurement3D",
        "esri/layers/VectorTileLayer",
    ], (
        MapView,
        SceneView,
        Map,
        GeoJSONLayer,
        SimpleRenderer,
        CIMSymbol,
        PolygonSymbol3D,
        AreaMeasurement2D,
        AreaMeasurement3D,
        VectorTileLayer
    ) => {
        // const switchButton = document.getElementById("switch-btn");

        const appConfig = {
            mapView: null,
            sceneView: null,
            activeView: null,
            container: div // use same container for views
        };

        const initialViewParams = {
            zoom: 7,
            center: [174.777, -41.288],
            container: appConfig.container
        };

        const map = new Map({ basemap: "gray-vector" });
        const scene = new Map({
            basemap: "gray-vector", ground: {
                // navigationConstraint: "none",
                opacity: 0.8
            },
        });

        // Cesium expects elevation in meters
        for (const feature of geojson.features) {
            const coords = feature.geometry.coordinates[0];
            for (var i = 0; i < coords.length; i++) {
                const [lon, lat, ele] = coords[i];
                coords[i] = [lon, lat, ele * -1000];
            }
        }
        // create a new blob from geojson featurecollection
        const blob = new Blob([JSON.stringify(geojson)], {
            type: "application/json"
        });

        // URL reference to the blob
        const url = URL.createObjectURL(blob);
        // 

        const createMapRenderer = () => new SimpleRenderer({
            symbol: new CIMSymbol({
                data: {
                    type: "CIMSymbolReference",
                    symbol: {
                        type: "CIMPolygonSymbol",
                        symbolLayers: [
                            {
                                type: "CIMSolidFill",
                                color: [151, 219, 242, 127.5],
                                enable: true,
                                colorLocked: false,
                            },
                        ]
                    },
                }
            })
        });

        const createSceneRenderer = () => new SimpleRenderer({
            symbol: new PolygonSymbol3D({
                symbolLayers: [{
                    type: 'fill',
                    material: { color: [0, 0, 242, 0.5] },
                }]
            })
        });

        const layer = new GeoJSONLayer({
            url,
            elevationInfo: { mode: "absolute-height" },
            hasZ: true,
            blendMode: "multiply"
        });

        // create 2D view and and set active
        appConfig.mapView = createView(initialViewParams, "2d");
        appConfig.mapView.map = map;
        appConfig.activeView = appConfig.mapView;

        // create 3D view, won't initialize until container is set
        initialViewParams.container = null;
        initialViewParams.map = scene;
        appConfig.sceneView = createView(initialViewParams, "3d");
        setView("3D");

        // // switch the view between 2D and 3D each time the button is clicked
        // switchButton.addEventListener("click", switchView);

        // Add Measurement widget
        let areaMeasurement2D = new AreaMeasurement2D({ view: appConfig.mapView });
        appConfig.mapView.ui.add(areaMeasurement2D, "top-right");

        let areaMeasurement3D = new AreaMeasurement3D({ view: appConfig.sceneView });
        appConfig.sceneView.ui.add(areaMeasurement3D, "top-right");

        function setView(viewType) {
            if (viewType === "2D") {
                appConfig.mapView.container = appConfig.container;
                appConfig.activeView = appConfig.mapView;
                layer.renderer = createMapRenderer();
                scene.remove(layer);
                map.add(layer);
            } else {
                appConfig.sceneView.container = appConfig.container;
                appConfig.activeView = appConfig.sceneView;
                layer.renderer = createSceneRenderer(); // Responsible of bug
                map.remove(layer);
                scene.add(layer);
            }
        }

        // Switches the view from 2D to 3D and vice versa
        // function switchView() {
        //     const is3D = appConfig.activeView.type === "3d";
        //     const activeViewpoint = appConfig.activeView.viewpoint.clone();

        //     // remove the reference to the container for the previous view
        //     appConfig.activeView.container = null;

        //     if (is3D) {
        //         // if the input view is a SceneView, set the viewpoint on the
        //         // mapView instance. Set the container on the mapView and flag
        //         // it as the active view
        //         appConfig.mapView.viewpoint = activeViewpoint;
        //         switchButton.value = "3D";
        //         setView("2D");
        //     } else {
        //         appConfig.sceneView.viewpoint = activeViewpoint;
        //         switchButton.value = "2D";
        //         setView("3D");
        //     }
        // }

        // convenience function for creating either a 2D or 3D view dependant on the type parameter
        function createView(params, type) {
            let view;
            if (type === "2d") {
                view = new MapView(params);
                return view;
            } else {
                view = new SceneView(params);
            }
            return view;
        }

        div.addEventListener("contextmenu", function(ev) {
            console.log(ev);
   
                ev.stopPropagation();
        })
    });
    el.appendChild(div);

}

export default { render };