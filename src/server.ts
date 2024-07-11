import fastify from 'fastify'
import { createTrip } from './routes/create-trip'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { confirmTrip } from './routes/confirm-trip'
import cors from '@fastify/cors'

const app = fastify()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(cors, {
  origin: '*',
})

app.register(createTrip)
app.register(confirmTrip)

app.listen({ port: 3000, host: '0.0.0.0' }).then(() => {
  console.log('Server running on port 3000 🚀')
})
