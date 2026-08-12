import * as THREE from 'three'
import Application from '../../Application.js'
import config from "../../../config.js";

export default class IKTarget
{
    constructor(name, parent, effectorBone, offset = 1.0 , modelLength = 1)
    {
        this.application = new Application()
        this.scene = this.application.scene
        this.debug = this.application.debug

        if(this.debug.active && !IKTarget.debugFolder)
        {
            IKTarget.debugFolder = this.debug.ui.addFolder('IK Targets')
            IKTarget.debugFolder.add(config.ik, 'showTargets').name('Show Targets').onChange((v) =>
            {
                IKTarget.instances.forEach(m => m.visible = v)
            })
            IKTarget.debugFolder.add(config.ik, 'manualTargets').name('Manual')
            IKTarget.instances = []
            IKTarget.debugFolder.close()
        }

        this.setSphere(parent, effectorBone, offset, modelLength)
        this.setDebug(name)
    }

    setSphere(parent, effectorBone, offset, modelLength)
    {
        console.log('modelLength for sphere',modelLength)
        const geometry = new THREE.SphereGeometry(modelLength * config.ik.sphereSize, 16, 16)
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.visible = config.ik.showTargets ?? true

        if(IKTarget.instances) IKTarget.instances.push(this.mesh)

        const rootPos = new THREE.Vector3()
        const effectorPos = new THREE.Vector3()
        parent.getWorldPosition(rootPos)
        effectorBone.getWorldPosition(effectorPos)

        const direction = effectorPos.clone().sub(rootPos).normalize()
        const length = rootPos.distanceTo(effectorPos)

        const worldTarget = rootPos.clone().add(direction.multiplyScalar(length * offset))
        const localTarget = parent.worldToLocal(worldTarget)

        this.mesh.position.copy(localTarget)
        parent.add(this.mesh)
        this.parent = parent
    }

    setDebug(name)
    {
        if(this.debug.active && IKTarget.debugFolder)
        {
            const folder = IKTarget.debugFolder.addFolder(name)
            folder.add(this.mesh.position, 'x').min(-0.5).max(0.5).step(0.001).name('X')
            folder.add(this.mesh.position, 'y').min(-0.5).max(0.5).step(0.001).name('Y')
            folder.add(this.mesh.position, 'z').min(-0.5).max(0.5).step(0.001).name('Z')
            folder.close()
        }
    }

    getPosition()
    {
        const worldPosition = new THREE.Vector3()
        this.mesh.getWorldPosition(worldPosition)
        return worldPosition
    }

    destroy()
    {
        this.parent.remove(this.mesh)
    }
}