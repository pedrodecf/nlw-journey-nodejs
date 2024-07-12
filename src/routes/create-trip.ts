import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getMailCient } from '../lib/mail'
import nodemailer from 'nodemailer'
import { dayjs } from '../lib/dayjs'
import { ClientError } from '../errors/client-error'

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
          emails_to_invite: z.array(z.string().email()),
        }),
      },
    },
    async (request) => {
      const {
        destination,
        ends_at,
        starts_at,
        owner_name,
        owner_email,
        emails_to_invite,
      } = request.body

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new ClientError('Start date must be in the future')
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new ClientError('End date must be after start date')
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          ends_at,
          starts_at,
          participants: {
            createMany: {
              data: [
                {
                  name: owner_name,
                  email: owner_email,
                  is_owner: true,
                  is_confirmed: true,
                },
                ...emails_to_invite.map((email) => {
                  return { email }
                }),
              ],
            },
          },
        },
      })

      const formattedStartDate = dayjs(starts_at).format('LL')
      const formattedEndDate = dayjs(ends_at).format('LL')

      const confirmationLink = `http://localhost:3000/trips/${trip.id}/confirm`

      const mail = await getMailCient()

      const ownerMail = await mail.sendMail({
        from: {
          name: 'Trip Planner',
          address: 'contato@planner.com.br',
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: `Confirme sua viagem para ${trip.destination} em ${formattedStartDate} ✈️🧳`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
        <p>Você solicitou a criação de uma viagem para <strong>${trip.destination}, </strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
        </br>
        <p>Para confirmar sua viagem, clique no link abaixo:</p>
        </br>
        <p>
          <a href="${confirmationLink}">Confirmar viagem</a>
        </p>
        </br>
        <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
        </div>
        `.trim(),
      })

      console.log(nodemailer.getTestMessageUrl(ownerMail))

      return {
        tripId: trip.id,
      }
    },
  )
}
