import 'reflect-metadata'

import { __prod__ } from './constants';

import {MikroORM} from '@mikro-orm/core'
import mikroConfig from './mikro-orm.config'

import express from 'express'
import {ApolloServer} from 'apollo-server-express'
import {buildSchema} from 'type-graphql'
import PostResolver from './resolvers/post';
import { UserResolver } from './resolvers/user';
import cors from 'cors'

const redis = require('redis')
const session = require('express-session')



const main = async () => {
    // init ORM and migrate to latest
    const orm = await MikroORM.init(mikroConfig)    
    await orm.getMigrator().up()

    // express app
    const app = express()

    // session middleware
    const RedisStore = require('connect-redis')(session)
    const redisClient = redis.createClient()

    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true
        })
    )

    // cookie
    app.use(
        session({
            name: 'qid',
            store: new RedisStore({ client: redisClient, disableTouch: true }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true,
                sameSite: 'lax', // csrf
                secure: __prod__ // cookie only works in https
            },
            saveUninitialized: false,
            secret: 'abcd1234',
            resave: false,
        })
    )


    // type-graphql apollo middleware
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({ em: orm.em, req, res }),
    })
    apolloServer.applyMiddleware({app, cors: false})

    // routes
    app.get('/', (_, res) => {
        res.send("hello")
    })

    // init 
    app.listen(4000, () => {
        console.log("server is running on port 4000s");
    })
  

}

main().catch((err) => {
    console.log(err);
})

// 0. init the dev environment 
// 1. setting up mikro-orm entities and migration
// 2. apply the TypeGraphQL middleware to the Express App through apolloServer
// 3. Store session cookies in memory using Redis (use session middleware inside the apollo middleware)