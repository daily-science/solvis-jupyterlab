
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

const toLatLonString = function (cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(
        cartesian
    );

    const longitudeString = Cesium.Math.toDegrees(
        cartographic.longitude
    ).toFixed(2);
    const latitudeString = Cesium.Math.toDegrees(
        cartographic.latitude
    ).toFixed(2);
    const heightString = cartographic.height.toFixed(2);

    return " " + latitudeString + "," + longitudeString + ", " + heightString;
};

function CameraController(viewer) {
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

    const right_move = function (movement) {
        //    console.log(viewer.scene.pickPositionSupported);
        //    console.log(movement);
        //    console.log(movement.endPosition);

        const thePosition = movement.endPosition;
        //  console.log("Y movement: "+ (movement.startPosition.y - movement.endPosition.y));

        //        console.log("camera direction: " + viewer.scene.camera.direction);
        //      console.log("camera position: " + viewer.scene.camera.position);

        const lat = Cesium.Math.PI * 1.5 - pickedCartographic.latitude;
        const lon = pickedCartographic.longitude;

        // console.log("pickedCartographic: " + pickedCartographic);


        const pitch = (Cesium.Math.PI / 360) * -(startMousePosition.y - movement.endPosition.y);
        const roll = (Cesium.Math.PI / 360) * (startMousePosition.x - movement.endPosition.x);

        //  console.log("pitch: " + pitch);

        const rotQuat = Cesium.Quaternion.fromAxisAngle(pickedPosition, roll);
        const quatRotM = Cesium.Matrix3.fromQuaternion(rotQuat);
        const pitchAxis = mmul(startRight, quatRotM);
        const pitchQuat = Cesium.Quaternion.fromAxisAngle(pitchAxis, -pitch);
        const pitchRotM = Cesium.Matrix3.fromQuaternion(pitchQuat);


        const a = new Cesium.Cartesian3();
        const b = new Cesium.Cartesian3();

        // console.log("startRot: " + startRot);
        // console.log("endRot: " + endRot);
        // console.log("simpleRotationMatrix: " + simpleRotationMatrix);



        Cesium.Cartesian3.subtract(startPosition, pickedPosition, a);
        //    const a2 = mmul(a, endRot, simpleRotationMatrixRoll, simpleRotationMatrixPitch, startRot);
        const a2 = mmul(a, quatRotM, pitchRotM);
        Cesium.Cartesian3.add(a2, pickedPosition, b);
        viewer.scene.camera.position = b;

        const c = new Cesium.Cartesian3();
        const d = new Cesium.Cartesian3();

        // console.log(startDirection);

        //    const d2 = mmul(startDirection, endRot, simpleRotationMatrixRoll, simpleRotationMatrixPitch, startRot);
        const d2 = mmul(startDirection, quatRotM, pitchRotM);

        viewer.scene.camera.direction = d2;

        const e = new Cesium.Cartesian3();
        const f = new Cesium.Cartesian3();

        //    const f2 = mmul(startUp, endRot, simpleRotationMatrixRoll, simpleRotationMatrixPitch, startRot);
        const f2 = mmul(startUp, quatRotM, pitchRotM);

        viewer.scene.camera.up = f2;

        //    viewer.scene.camera.right = mmul(startRight, endRot, simpleRotationMatrixRoll, simpleRotationMatrixPitch, startRot);
        viewer.scene.camera.right = mmul(startRight, quatRotM, pitchRotM);
    }

    const left_move = function (movement) {
        const thePosition = movement.endPosition;


        const ray = startCamera.getPickRay(thePosition);
        // intersect with sphere
        // const sphere = new Cesium.BoundingSphere(pickedPosition,  Cesium.Cartesian3.magnitude(pickedPosition));
        // const interval = Cesium.IntersectionTests.raySphere(ray, sphere);
        // const point = Cesium.Ray.getPoint(ray, interval.stop);

        // intersect with plane
        const plane = new Cesium.Plane(Cesium.Cartesian3.normalize(pickedPosition, new Cesium.Cartesian3()), -Cesium.Cartesian3.magnitude(pickedPosition));
        const point = Cesium.IntersectionTests.rayPlane(ray, plane);

        //   const point = viewer.scene.pickPosition(thePosition);

        //  viewer.entities.add({
        //     position: point,
        //     ellipsoid: {
        //         radii: new Cesium.Cartesian3(200.0, 200.0, 200.0),
        //         material: Cesium.Color.GREEN,
        //     },
        // });


        // lat/lon rotation
        const cartographic = Cesium.Cartographic.fromCartesian(point);
        const hpr = new Cesium.HeadingPitchRoll(cartographic.longitude - pickedCartographic.longitude, cartographic.latitude - pickedCartographic.latitude, 0);
        const rotation = Cesium.Matrix3.fromHeadingPitchRoll(hpr);


        // quaternion

        // const rotAxis = Cesium.Cartesian3.cross(pickedPosition, point, new Cesium.Cartesian3());
        // const angle = Cesium.Cartesian3.angleBetween(pickedPosition, point);
        // const rotQuat = Cesium.Quaternion.fromAxisAngle(rotAxis, -angle);
        // const rotation = Cesium.Matrix3.fromQuaternion(rotQuat);


        // constant amount

        // const pitch = (Cesium.Math.PI / 100000) * -(startMousePosition.y - movement.endPosition.y);
        // const roll = (Cesium.Math.PI / 100000) * (startMousePosition.x - movement.endPosition.x);
        // const hpr = new Cesium.HeadingPitchRoll(-roll, -pitch, 0);
        // const rotation = Cesium.Matrix3.fromHeadingPitchRoll(hpr);


        // console.log(ray);
        // console.log(plane);
        // console.log("point: " + point);

        viewer.scene.camera.position = mmul(startPosition, rotation);
        viewer.scene.camera.direction = mmul(startDirection, rotation);
        viewer.scene.camera.up = mmul(startUp, rotation);
        viewer.scene.camera.right = mmul(startRight, rotation);

        //console.log(ray);

    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    console.log("pickTranslucentDepth : " + viewer.scene.pickTranslucentDepth);
    console.log("pickPositionSupported: " + viewer.scene.pickPositionSupported);

    handler.setInputAction(leftDown, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(rightDown, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

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


    handler.setInputAction(function (movement) {
        pickedPosition = undefined;
        mouseMode = NONE;
    }, Cesium.ScreenSpaceEventType.RIGHT_UP);

    handler.setInputAction(function (movement) {
        pickedPosition = undefined;
        mouseMode = NONE;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    handler.setInputAction(function (movement) {
        pickedPosition = undefined;
        mouseMode = NONE;

        const cartographic = Cesium.Cartographic.fromCartesian(
            viewer.scene.camera.position
        );

        const zoom = Math.max(Math.min(cartographic.height / 4, 50000), 1000);


        if (movement > 0) {
            viewer.scene.camera.zoomIn(zoom);
        } else {
            viewer.scene.camera.zoomOut(zoom);
        }
    }, Cesium.ScreenSpaceEventType.WHEEL);


};


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
            credit: new Cesium.Credit("OpenStreetMap", true)
        })),
        // large negative value to render large underground structures
        depthPlaneEllipsoidOffset: -50000.0,
    });


    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
    });
    viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
        function (e) {
            e.cancel = true;
            viewer.scene.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
            });
        }
    )
    viewer.scene.mode = Cesium.SceneMode.SCENE3D;
    viewer.scene.globe.translucency.enabled = true;

    const cameraController = new CameraController(viewer);

    for (const geojson of model.get("data")) {

        // Cesium expects elevation in meters
        for (const feature of geojson.features) {
            //    console.log(feature);
            const coords = feature.geometry.coordinates[0];
            for (var i = 0; i < coords.length; i++) {
                const [lon, lat, ele] = coords[i];
                coords[i] = [lon, lat, ele * -1000];
            }
        }
        viewer.dataSources.add(Cesium.GeoJsonDataSource.load(geojson));
    }



    div.addEventListener("contextmenu", function (ev) {
        ev.stopPropagation();
    })


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
