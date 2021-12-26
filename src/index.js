import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRM ,VRMSchema} from '@pixiv/three-vrm'
import { IK, IKChain, IKJoint, IKHelper } from 'three-ik'
import { TrackballControls } from 'three-trackballcontrols-ts';


window.addEventListener("DOMContentLoaded", () => {
  // canvasの取得
  const canvas = document.getElementById('canvas')

  // シーンの生成
  const scene = new THREE.Scene()

  // カメラの生成
  const camera = new THREE.PerspectiveCamera(
    30, canvas.clientWidth/canvas.clientHeight, 1, 1000)
    camera.position.set(0, 0.7, -4);
    camera.rotation.set(0, Math.PI, 0)
    camera.lookAt({x:0, y:100, z:0 });
  
  
  // Controls
  var controls = new TrackballControls(camera,document.getElementById("canvas"));
  controls.rotateSpeed = 5.0; //回転速度
  controls.zoomSpeed = 0.5;//ズーム速度
  controls.panSpeed = 2.0;//パン速度
  controls.target = new THREE.Vector3(0, 0.8, 0);


  var axis = new THREE.AxisHelper(1000);
  axis.position.set(0,0,0);
  scene.add(axis);
  
  // レンダラーの生成
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setClearColor(0x7fbfff, 1.0)
  canvas.appendChild(renderer.domElement)

  // ライトの生成
  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(-1, 1, -1).normalize()
  scene.add(light)

  // VRMの読み込み
  const loader = new GLTFLoader()
  loader.load('./alicia.vrm',
    (gltf) => {
      VRM.from(gltf).then( (vrm) => {
        // シーンへの追加
        scene.add(vrm.scene)
        // IKの準備
        const ikList = [new IK(), new IK()] // IKシステム
        const chainList = [new IKChain(), new IKChain()] // チェーン
        const pivotList = [] // ピボット
        const bonesList = [] // ボーン
        const nodesList = [] // ノード

        // ボーン名
        let boneName = [
          [VRMSchema.HumanoidBoneName.LeftUpperArm,
            VRMSchema.HumanoidBoneName.LeftLowerArm,
            VRMSchema.HumanoidBoneName.LeftHand],
          [VRMSchema.HumanoidBoneName.RightUpperArm,
           VRMSchema.HumanoidBoneName.RightLowerArm,
           VRMSchema.HumanoidBoneName.RightHand]]

        for (let j = 0; j < 2; j++) {
          // ターゲットの生成
          const movingTarget = new THREE.Mesh(
            new THREE.SphereGeometry(0.05),
            new THREE.MeshBasicMaterial({color: 0xff0000}))
          movingTarget.position.x = -0.2
          let pivot = new THREE.Object3D()
          pivot.add(movingTarget)
          pivot.position.x =  j == 0 ? -0.3 : 0.3
          pivot.position.y = 1.2
          pivot.position.z = -0.3
          scene.add(pivot)
          pivotList.push(pivot)

          // チェーンの生成
          const bones = [] // ボーン
          const nodes = [] // ノード
          for (let i = 0; i < 3; i++) {
            // ボーンとノードの生成
            const bone = new THREE.Bone()
            let node = vrm.humanoid.getBoneNode(boneName[j][i])
 
            if (i == 0) {
              node.getWorldPosition(bone.position)
            } else {
              bone.position.set(node.position.x, node.position.y, node.position.z)
              bones[i - 1].add(bone)
            }
            bones.push(bone)
            nodes.push(node)
 
            // チェーンに追加
            const target = i === 2 ? movingTarget : null
            chainList[j].add(new IKJoint(bone, {}), {target})
          }

          // IKシステムにチェーン追加
          ikList[j].add(chainList[j])

          // リストに追加
          bonesList.push(bones)
          nodesList.push(nodes)

          // ルートボーンの追加
          scene.add(ikList[j].getRootBone())

          // ヘルパーの追加
          //const helper = new IKHelper(ikList[j])
          //scene.add(helper)
        }

        // 更新の開始
        update(vrm, ikList, pivotList, bonesList, nodesList)
      })
    }
  )

  // 腕の更新
  const updateArm = (bones, nodes, offset) => {
    const q = new THREE.Quaternion()
    q.setFromAxisAngle( new THREE.Vector3(0, 1, 0), offset)
    nodes[0].setRotationFromQuaternion(bones[0].quaternion.multiply(q))
    nodes[1].setRotationFromQuaternion(bones[1].quaternion)
    nodes[2].setRotationFromQuaternion(bones[2].quaternion)
  }

  // フレーム毎回に呼ばれる
  const update = (vrm, ikList, pivotList, bonesList, nodesList) => {
    // ターゲットの移動
    pivotList[0].rotation.z -= 0.01
    pivotList[1].rotation.z += 0.01

    // IKの更新
    ikList[0].solve()
    ikList[1].solve()

    // 腕の更新
    updateArm(bonesList[0], nodesList[0], Math.PI / 2)
    updateArm(bonesList[1], nodesList[1], -Math.PI / 2)

    

    // フレーム更新
    requestAnimationFrame(() => update(vrm, ikList, pivotList, bonesList, nodesList))
    renderer.render(scene, camera)

    // Controlの更新
    controls.update()
  }
})