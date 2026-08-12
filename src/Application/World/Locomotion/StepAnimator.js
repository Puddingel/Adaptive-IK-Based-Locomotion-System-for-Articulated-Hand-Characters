import * as THREE from 'three'

export default class StepAnimator
{
    constructor()
    {
        this.active   = false
        this.start    = new THREE.Vector3()
        this.end      = new THREE.Vector3()
        this.height   = 0
        this.duration = 0
        this.elapsed  = 0
    }

    begin(start, end, height, duration)
    {
        this.start.copy(start)
        this.end.copy(end)
        this.height   = height
        this.duration = duration * 1000
        this.elapsed  = 0
        this.active   = true
    }

    update(delta)
    {
        if(!this.active)
            return { position: this.end.clone(), done: false }

        this.elapsed += delta

        const t = Math.min(this.elapsed / this.duration, 1)

        const ease = t * t * (3 - 2 * t)

        const position = new THREE.Vector3().lerpVectors(this.start, this.end, ease)

        position.y += Math.sin(t * Math.PI) * this.height

        const done = t >= 1
        if(done) this.active = false

        return { position, done }
    }

    toLocalSpace(worldPosition, parent, target)
    {
        target.copy(parent.worldToLocal(worldPosition.clone()))
    }
}