const path = require("path");
const canvas = require("canvas");
const tf = require("@tensorflow/tfjs");
const wasm = require("@tensorflow/tfjs-backend-wasm");

const faceapi = require(
  "@vladmandic/face-api/dist/face-api.node-wasm.js"
);

const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({
  Canvas,
  Image,
  ImageData,
});

async function testFaceModels() {
  try {
    wasm.setWasmPaths(
      "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/"
    );

    await tf.setBackend("wasm");
    await tf.ready();

    console.log("✅ TensorFlow backend:", tf.getBackend());

    const modelPath = path.join(
      __dirname,
      "src",
      "face-models"
    );

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    console.log("✅ SSD MobileNet loaded");

    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    console.log("✅ Face Landmark 68 loaded");

    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    console.log("✅ Face Recognition loaded");

    console.log("\n🎉 All models loaded successfully!");
  } catch (error) {
    console.error("❌ Model test failed:", error);
    process.exitCode = 1;
  }
}

testFaceModels();