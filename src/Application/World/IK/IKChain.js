import * as THREE from 'three'
import chainDefinitions from "./ChainDefinitions.js";
import CCDSolver from "./CCDSolver.js";
import config from "../../../config.js";

export default class IKChain
{
    constructor(name, bones, effector, target, options = {})
    {
        this.name = name
        this.bones = bones
        this.effector = effector
        this.target = target

        this.constraints = options.constraints || bones.map(() => ({
            x: { min: 0, max: Math.PI / 2 },
            y: { min: 0, max: 0 },
            z: { min: 0, max: 0 }
        }))

        this.couplingRatio = options.couplingRatio || null
        this.pipIndex = options.pipIndex !== undefined ? options.pipIndex : 1
        this.dipIndex = options.dipIndex !== undefined ? options.dipIndex : 2

        const solveBones = (this.couplingRatio !== null)
            ? this.bones.slice(0, this.dipIndex)
            : this.bones

        const solveConstraints = (this.couplingRatio !== null)
            ? this.constraints.slice(0, this.dipIndex)
            : this.constraints

        this.solver = new CCDSolver(
            solveBones,
            this.effector,
            this.target,
            solveConstraints
        )
    }

    static createAll(bones, ikTargets)
    {
        const chains = {}

        chainDefinitions.forEach((def) =>
        {
            chains[def.name] = new IKChain(
                def.name,
                def.bones.map(boneName => bones[boneName]),
                bones[def.effector],
                () => ikTargets[def.name].getPosition(),
                {
                    constraints: def.constraints,
                    couplingRatio: def.couplingRatio
                }
            )
        })

        return chains
    }

    applyDIPCoupling()
    {
        if(this.couplingRatio === null) return

        const pipBone = this.bones[this.pipIndex]
        const dipBone = this.bones[this.dipIndex]
        const dipConstraint = this.constraints[this.dipIndex]

        dipBone.rotation.x = pipBone.rotation.x * this.couplingRatio

        if(dipConstraint && !config.ccdsolver.disableConstraints)
        {
            dipBone.rotation.x = Math.max(dipConstraint.x.min, Math.min(dipConstraint.x.max, dipBone.rotation.x))
        }
    }

    update()
    {
        this.lastSolveResult = this.solver.solve()
        this.applyDIPCoupling()
    }
}
