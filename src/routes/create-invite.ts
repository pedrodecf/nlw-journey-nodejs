import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { dayjs } from '../lib/dayjs'
import { getMailCient } from '../lib/mail'
import nodemailer from 'nodemailer'
import { ClientError } from '../errors/client-error'

export async function createInvites(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/invites',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          email: z.string().email(),
        }),
      },
    },
    async (request) => {
      const { email } = request.body
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
      })

      if (!trip) {
        throw new ClientError('Trip not found')
      }

      const participant = await prisma.participant.create({
        data: {
          email,
          trip_id: tripId,
        },
      })

      const formattedStartDate = dayjs(trip.starts_at).format('LL')
      const formattedEndDate = dayjs(trip.ends_at).format('LL')

      const mail = await getMailCient()

      const confirmationLink = `http://localhost:3000/trips/participants/${participant.id}/confirm`
      const message = await mail.sendMail({
        from: {
          name: 'Trip Planner',
          address: 'contato@planner.com.br',
        },
        to: participant.email,
        subject: `Confirme sua viagem para ${trip.destination} em ${formattedStartDate} ✈️🧳`,
        html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}, </strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
            </br>
            <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
            </br>
            <p>
              <a href="${confirmationLink}">Confirmar viagem</a>
            </p>
            </br>
            <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
            </div>
            `.trim(),
      })

      console.log(nodemailer.getTestMessageUrl(message))

      return {
        participantId: participant.id,
      }
    },
  )
}
