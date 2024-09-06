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

function CameraController(viewer, callback) {
    const NONE = 0;
    const LEFT = 1;
    const MIDDLE = 2;
    const RIGHT = 3;

    var mouseMode = NONE;
    var pickedPosition;
    var pickedCartographic;
    var startPosition;
    var startDirection;
    var startUp;
    var startRight;
    var startMousePosition;
    var startCamera;

    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    viewer.scene.screenSpaceCameraController.enableTranslate = false;
    viewer.scene.screenSpaceCameraController.enableZoom = false;
    viewer.scene.screenSpaceCameraController.enableRotate = false;
    viewer.scene.screenSpaceCameraController.enableTilt = false;
    viewer.scene.screenSpaceCameraController.enableLook = false;

    viewer.scene.pickTranslucentDepth = true;

    const leftDown = function (event) {

        const ray = viewer.camera.getPickRay(event.position);
        const picked = viewer.scene.pickFromRay(ray);

        if (picked && picked.object) {
            pickedPosition = picked.position;
        } else {
            const cartesian = viewer.camera.pickEllipsoid(
                event.position,
                viewer.scene.globe.ellipsoid
            );
            pickedPosition = cartesian;
        }

        if (pickedPosition) {

            mouseMode = LEFT;
            pickedCartographic = Cesium.Cartographic.fromCartesian(pickedPosition);

            startMousePosition = event.position;
            startPosition = viewer.scene.camera.position.clone();
            startDirection = viewer.scene.camera.direction.clone();
            startUp = viewer.scene.camera.up.clone();
            startRight = viewer.scene.camera.right.clone();

            startCamera = new Cesium.Camera(viewer.scene);
            startCamera.position = startPosition;
            startCamera.direction = startDirection;
            startCamera.up = startUp;
            startCamera.right = startRight;
        }
    }

    const rightDown = function (event) {

        const ray = viewer.camera.getPickRay(event.position);
        const picked = viewer.scene.pickFromRay(ray);

        if (picked && picked.object) {
            pickedPosition = picked.position;
        } else {
            const cartesian = viewer.camera.pickEllipsoid(
                event.position,
                viewer.scene.globe.ellipsoid
            );
            pickedPosition = cartesian;
        }

        if (pickedPosition) {
            mouseMode = RIGHT;
            pickedCartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
            startMousePosition = event.position;
            startPosition = viewer.scene.camera.position.clone();
            startDirection = viewer.scene.camera.direction.clone();
            startUp = viewer.scene.camera.up.clone();
            startRight = viewer.scene.camera.right.clone();
        }
    };


    const mmul = function (inVector, ...m3s) {
        return m3s.reduce(function (vec, mat) {
            return Cesium.Matrix3.multiplyByVector(mat, vec, new Cesium.Cartesian3());
        }, inVector);
    }

    const setCamera = function (position, direction, up, right) {
        viewer.scene.camera.position = position;
        viewer.scene.camera.direction = direction;
        viewer.scene.camera.up = up;
        viewer.scene.camera.right = right;
        if (callback) {
            callback(position, direction, up);
        }
    }

    const right_move = function (movement) {

        // This rotates the camera around the axis origin->pickedPosition for heading, 
        // and around the camera's "right" vector for pitch.

        const pitch = (Cesium.Math.PI / 360) * -(startMousePosition.y - movement.endPosition.y);
        const roll = (Cesium.Math.PI / 360) * (startMousePosition.x - movement.endPosition.x);
        const rotQuat = Cesium.Quaternion.fromAxisAngle(pickedPosition, roll);
        const quatRotM = Cesium.Matrix3.fromQuaternion(rotQuat);
        const pitchAxis = mmul(startRight, quatRotM);
        const pitchQuat = Cesium.Quaternion.fromAxisAngle(pitchAxis, -pitch);
        const pitchRotM = Cesium.Matrix3.fromQuaternion(pitchQuat);

        // the camera position needs to be translated into and out of the pickedPosition frame
        const a = new Cesium.Cartesian3();
        Cesium.Cartesian3.subtract(startPosition, pickedPosition, a);
        const b = mmul(a, quatRotM, pitchRotM);
        Cesium.Cartesian3.add(b, pickedPosition, a);

        // these are normal vectors that only need to be rotated
        const direction = mmul(startDirection, quatRotM, pitchRotM);
        const up = mmul(startUp, quatRotM, pitchRotM);
        const right = mmul(startRight, quatRotM, pitchRotM);

        setCamera(a, direction, up, right);
    }

    const left_move = function (movement) {

        // this rotates the camera around the globe's origin so that the pickedPosition from
        // the drag start is now at roughly the current mouse position when viewed through the camera.

        const ray = startCamera.getPickRay(movement.endPosition);
        // intersect with sphere
        // const sphere = new Cesium.BoundingSphere(pickedPosition,  Cesium.Cartesian3.magnitude(pickedPosition));
        // const interval = Cesium.IntersectionTests.raySphere(ray, sphere);
        // const point = Cesium.Ray.getPoint(ray, interval.stop);

        // intersect with plane
        const plane = new Cesium.Plane(Cesium.Cartesian3.normalize(pickedPosition, new Cesium.Cartesian3()), -Cesium.Cartesian3.magnitude(pickedPosition));
        const point = Cesium.IntersectionTests.rayPlane(ray, plane);

        if (!point) {
            return;
        }

        // lat/lon rotation
        const cartographic = Cesium.Cartographic.fromCartesian(point);
        const hpr = new Cesium.HeadingPitchRoll(cartographic.longitude - pickedCartographic.longitude, cartographic.latitude - pickedCartographic.latitude, 0);
        const rotation = Cesium.Matrix3.fromHeadingPitchRoll(hpr);


        // quaternion
        // const rotAxis = Cesium.Cartesian3.cross(pickedPosition, point, new Cesium.Cartesian3());
        // const angle = Cesium.Cartesian3.angleBetween(pickedPosition, point);
        // const rotQuat = Cesium.Quaternion.fromAxisAngle(rotAxis, -angle);
        // const rotation = Cesium.Matrix3.fromQuaternion(rotQuat);

        setCamera(
            mmul(startPosition, rotation),
            mmul(startDirection, rotation),
            mmul(startUp, rotation),
            mmul(startRight, rotation));
    }

    const stopDrag = function () {
        pickedPosition = undefined;
        mouseMode = NONE;
    }

    const wheel = function (event) {
        stopDrag();

        const cartographic = Cesium.Cartographic.fromCartesian(
            viewer.scene.camera.position
        );

        const zoom = Math.max(Math.min(cartographic.height / 4, 50000), 1000);

        if (event > 0) {
            viewer.scene.camera.zoomIn(zoom);
        } else {
            viewer.scene.camera.zoomOut(zoom);
        }
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(leftDown, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(rightDown, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    handler.setInputAction(stopDrag, Cesium.ScreenSpaceEventType.RIGHT_UP);
    handler.setInputAction(stopDrag, Cesium.ScreenSpaceEventType.LEFT_UP);
    handler.setInputAction(wheel, Cesium.ScreenSpaceEventType.WHEEL);

    handler.setInputAction(function (movement) {
        if (!pickedPosition || mouseMode < 0) {
            return;
        }

        if (mouseMode == RIGHT) {
            right_move(movement);
        }

        if (mouseMode == LEFT) {
            left_move(movement);
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
};

function PickController(viewer, callback) {

    if (!callback) {
        throw new Error("callback is required");
    }
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(function (event) {
        const picked = viewer.scene.pick(event.position);
        if (picked) {
            callback({ picked, position: event.position });
        }
    }
        , Cesium.ScreenSpaceEventType.RIGHT_DOWN);
}

function RangeWidget(parent, min, max, selected, callback) {

    const div = document.createElement("div");
    div.classList.add("rangeWidget");

    const slider = document.createElement("input");
    slider.type = "range";
    slider.classList.add("rangeSlider");
    slider.min = min;
    slider.max = max;
    slider.value = selected;

    const sliderForward = document.createElement("div");
    sliderForward.classList.add("fa");
    sliderForward.classList.add("fa-forward");
    sliderForward.classList.add("sliderControlButton");

    const sliderBack = document.createElement("div");
    sliderBack.classList.add("fa");
    sliderBack.classList.add("fa-backward");
    sliderBack.classList.add("sliderControlButton");

    if (callback) {
        slider.addEventListener("change", function (event) {
            callback({
                type: "change",
                value: event.target.value
            });
        });
        slider.addEventListener("input", function (event) {
            callback({
                type: "input",
                value: event.target.value
            });
        });
        sliderForward.addEventListener("click", function (event) {
            console.log("max " + max + " slider " + slider.value);
            if (max > slider.value) {
                slider.value++;
                callback({
                    type: "forward",
                    value: slider.value
                });
            }
        });
        sliderBack.addEventListener("click", function (event) {
            if (min < slider.value) {
                slider.value--;
                callback({
                    type: "back",
                    value: slider.value
                });
            }
        });
    }

    div.appendChild(slider);
    div.appendChild(sliderBack);
    div.appendChild(sliderForward);
    parent.appendChild(div);

    return function (value) {
        if (value >= min && value <= max) {
            slider.value = value;
            callback({
                type: "setValue",
                value: slider.value
            });
        }
    }
}

function render({ model, el }) {

    const div = document.createElement("div");
    div.id = "cesiumContainer";
    div.style.width = model.get("width");
    div.style.height = model.get("height");


    const viewer = new Cesium.Viewer(div, {
        animation: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        sceneModePicker: false,
        homeButton: true,
        geocoder: false,
        fullscreenButton: true,
        fullscreenElement: div,
        timeline: false,
        baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
            credit: new Cesium.Credit("Cesium: OpenStreetMap", true)
        })),
        // large negative value to render large underground structures
        depthPlaneEllipsoidOffset: -100000.0,
    });

    const oldCamera = model.get("_camera");
    if (oldCamera && Object.keys(oldCamera).length > 0) {
        viewer.camera.setView({
            destination: oldCamera.position,
            orientation: {
                direction: oldCamera.direction,
                up: oldCamera.up
            }
        })
    } else {
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
        });
    }

    viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
        function (e) {
            e.cancel = true;
            viewer.zoomTo(dataSources[selected]);
        }
    )
    viewer.scene.mode = Cesium.SceneMode.SCENE3D;
    viewer.scene.globe.translucency.enabled = true;
    viewer.scene.globe.translucency.frontFaceAlpha = 0.5;
    viewer.scene.globe.undergroundColor = Cesium.Color.WHITE;

    const cameraCallback = function (position, direction, up) {
        model.set("_camera", {
            "position": position,
            "direction": direction,
            "up": up
        });
        model.save_changes();
    }

    new CameraController(viewer, cameraCallback);
    // new PickController(viewer,
    //     function ({ picked, position }) {
    //         console.log(picked);
    //         const canvas = document.createElement("canvas");
    //         canvas.classList.add("sampleCanvas");
    //         canvas.width = 200;
    //         canvas.height = 200;
    //         var ctx = canvas.getContext("2d");
    //         ctx.beginPath();
    //         ctx.arc(100, 100, 40, 0, 2 * Math.PI);
    //         ctx.stroke();
    //         el.appendChild(canvas);
    //     });

    const data = model.get("data");

    // console.log(JSON.stringify(data));

    var selected = model.get("selection") || 0;
    var extrusionScale = model.get("extrusion");

    console.log(extrusionScale);
    const dataSources = [];

    for (const geojson of data) {

        // Cesium expects elevation in meters
        for (const feature of geojson.features) {
            //    console.log(feature);
            const coords = feature.geometry.coordinates[0];
            for (var i = 0; i < coords.length; i++) {
                const [lon, lat, ele] = coords[i];
                if (extrusionScale > 0) {
                    coords[i] = [lon, lat];
                } else {
                    coords[i] = [lon, lat, ele * -1000];
                }
                //     console.log(coords[i]);
            }

            // simulating some of https://leafletjs.com/reference.html#path-option
            const style = feature.properties.style;
            if (style) {
                const mappings = [
                    ["color", "stroke"],
                    ["weight", "stroke-width"],
                    ["opacity", "stroke-opacity"],
                    ["fillColor", "fill"],
                    ["fillOpacity", "fill-opacity"]
                ];
                for (var [from, to] of mappings) {
                    if (style[from]) {
                        feature.properties[to] = style[from];
                    }
                }

            }
        }
        const dataSource = Cesium.GeoJsonDataSource.load(geojson)

        const show = selected === -1 || dataSources.length == selected;
        dataSource.then(function (ds) {
            ds.show = show;
            // console.log(ds.entities.values);
            if (extrusionScale > 0) {
                for (const entity of ds.entities.values) {
                    entity.polygon.extrudedHeight = entity.properties.participation * extrusionScale
                }
            }
        })

        dataSources.push(dataSource);
        viewer.dataSources.add(dataSource);
    }

  //  console.log(JSON.stringify(data));

    viewer.zoomTo(dataSources[selected]);

    if (dataSources.length > 1 && selected > -1) {
        const updateFunction = new RangeWidget(div, 0, dataSources.length - 1, selected, function (event) {
            if (event.value !== selected) {
                dataSources[selected].then(function (source) {
                    source.show = false;
                });
                selected = event.value;
                dataSources[selected].then(function (source) {
                    source.show = true;
                });
                viewer.zoomTo(dataSources[selected]
                    // ,
                    // new Cesium.HeadingPitchRange(
                    //     viewer.scene.camera.heading,
                    //     viewer.scene.camera.pitch,
                    //     500000
                    // )
                );
            }
            if (model.get("selection") !== selected) {
                //                console.log("save selection changes to: " + selected);
                model.set("selection", selected);
                model.save_changes();
                //                console.log(model);
            }
        });
        model.on("change:selection", function () {
            //            console.log("selection updated: " + model.get("selection"));
            updateFunction(model.get("selection"));
        });
    }

    div.addEventListener("contextmenu", function (ev) {
        ev.stopPropagation();
    })

    el.appendChild(div);

    return function() {
        console.log("destroy map_3d_widget");
        while(dataSources.length){
            dataSources.pop();
        }
        viewer.entities.removeAll();
        viewer.destroy();
    }
}

export default { render };
