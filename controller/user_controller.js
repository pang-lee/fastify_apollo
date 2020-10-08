const UserModel = require('../database/model/user_model')
const { ForbiddenError } = require('apollo-server')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const isAuthenticated = resolverFunction => (parent, args, context) => {
    if (!context.me) return new ForbiddenError('Not logged in.')
    return resolverFunction.apply(null, [parent, args, context])
}

const UserController = {
    getAll: async () => await UserModel.find({}),
    getMe: isAuthenticated(async(_, args, { me }) => {
        return await UserModel.findById(me.uid._id)
    }),
    signUp: async (_, { input }) => {
        try {
            let user = await UserModel.find({ email: input.email })
            if(user.length !== 0) return new ForbiddenError('Email Duplicate')
            let encrypt = await bcrypt.hash(input.password, Number(process.env.SALT_ROUNDS))
            let create = await UserModel.create({ id: uuidv4(), email: input.email, password: encrypt, username: input.username })
            let sign = { token: jwt.sign({ uid: `${input.email}` }, process.env.SECRET, { expiresIn: '1d' }) }
            return Object.assign(create, sign)
        } catch(e) {
            console.log(e.message)
        }
    },
    logIn: async (_, { input }) => {
        try {
            let user = await UserModel.find({ email: input.email })
            if(user.length == 0) return new ForbiddenError('Email Not Found')
            let passwordCompare = await bcrypt.compare(input.password, user[0].password)
            if(!passwordCompare) return new ForbiddenError('Password Not Same')
            let sign = { token: jwt.sign({ uid: user[0] }, process.env.SECRET, { expiresIn: '1d' }) }
            return Object.assign(user[0], sign)
        } catch(e) {
            console.log(e.message)
        }
    }
}

module.exports = UserController