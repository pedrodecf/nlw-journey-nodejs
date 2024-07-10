import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import dayjs from 'dayjs'
import { getMailCient } from '../lib/mail'
import nodemailer from 'nodemailer'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips',
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
        }),
      },
    },
    async (request) => {
      const { destination, ends_at, starts_at, owner_name, owner_email } =
        request.body

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new Error('Start date must be in the future')
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new Error('End date must be after start date')
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          ends_at,
          starts_at,
        },
      })

      const mail = await getMailCient()

      const message = await mail.sendMail({
        from: {
          name: 'Trip Planner',
          address: 'contato@planner.com.br',
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: 'Trip created! ✈️🧳',
        html: `Your trip to ${destination} has been created! 🎉🎉🎉`,
      })

      console.log(nodemailer.getTestMessageUrl(message))

      return {
        tripId: trip.id,
      }
    },
  )
}
