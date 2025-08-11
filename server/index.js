import express from 'express'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import fs from 'fs'
import 'dotenv/config' 
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const app = express()
// app.use(cors())
// CORS: locked to your Netlify site in production (fallback * for dev)
const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || '*'
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: false }))

// === 換成你在 JaaS Console 取得的資訊 ===
// const APP_ID = 'vpaas-magic-cookie-e6818684269b43f892662594c6ebeec3' // sub
const APP_ID = process.env.JAAS_APP_ID
// const KID = 'vpaas-magic-cookie-e6818684269b43f892662594c6ebeec3/39cb1b'                           // JWT header 的 kid
const KID = process.env.JAAS_KID
/*const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCy245sOJHxbKW+
O58FgaWvWNJy1KBoy7RhshLHTyf3Haii1B4qCa/TkSSjxKhC/Qy5semX/OKO5mLY
t18bY7lCDponofkm5wqSs5L6WdtIOK0lg46efrZKkjatswXlBqPhxnoPr7oKrxJq
mdaGjKStktOzvFgxpRHSzd07ZMaRE43We9a2J9GYduhZ/JNLDO26TlU0rTyzJk1D
/aoxfRBwHL4nC5DYPMB3LEhs/4uieA1/J2/+1r2jw0pRCOwbwj1O0lsKcCc88+2/
wnbmoKMfuqhDdqwr9TndME5Wje4YAvW9lIhpUtTjBAQU0NW8oO9PjwI5ljVkZAj6
yx6ng0t9AgMBAAECggEBAKAslbB/PNvrg8cIV9Izl/CfZ+BkYL9Y5lKzibOqRM0+
Z15i/hyBjk+25Qwwuss7GWFXXi250B9PXWhdV7QMq8TnlNA3cwyOzl4wqUjAnetg
rlcxKNDyA0hnBsap03aWar9v4rIXmlGlFaYX3RGj9HppSmPlIUpcXMjfied9yYHz
c17OCtEsqXw54xlXzi1DojG6Bou9oAWuokjPUTda3kaxyzyxOkCZRk+X1Oib3kjm
DP017LiANGmTZ4LSK23Tji92n/aAi5E8ibjlIoS+aNt+G2uCQAKtbPXhpgZ7GAOi
SxM/9keRlAgf/PYSTrkghCzKiw/P7wBHORrPqRH1B9UCgYEA6SlL5ypVFxhhhrzu
ToDZ91H0renOEbZAJEWtGZ0z2k9mZwpcbo6rVbphIXffti8LJhsQ1WwkAVlQ3Lpy
lnPfAUcMl0Qw0Z9eietkSyPLmG07VWYCd9uZCZOLWcKzvPCGxVtukw0h3mUBdgck
gBbOp4ZTGA4j6U6lQHGxypt62CcCgYEAxGCNcR4gHzTpAK365CYd3wAflnB7qIHA
yuF1Zni6Q0xMuSnu7iWX/9RlENdUZg0DOdvgpfba01BA3UABoU2RPaYFO1lWzhyr
Vr8eHry3nCNxUpZrLFCLt3fUPyjtC8iFvh96QvNKOVRtuGJ6oMl7j8W3HF5RiC+F
zZl3LYrewbsCgYAOvGttqsFB+mp/h4VQNNiRxv49158Mg4Y+RKESE1tpmscQEBmT
azTs8CCfauIas5Jy0BcaRgFojGqN6MLBO4WGoSTskoS7WuUwtk3aaeK+OXkchpv1
U02yyz5tZ97QPCtoYcT1SkkvsxaKjR0Dc22QLO8ngA1I+416KzVfZsA21QKBgAur
CPxto87239lQfRXNRf0YDshrio1qmD/1wXoDNl4FTJG78hxoU225+v9TLAqcP1LS
w7hYwIvJuvDqeq5Q445cLPdnyYaZoXyYAnwlDmvSl0sm8NtDNeoCzrOqBNusYHX5
fNQ5jHF3mMVZ5JtlHVhfkQ+4cvO6jyK2OaSVGcM9AoGAWzjoJK8HLDGwma/euys2
z/wiKBCsLR8HB3qXzKvEgRq0NGC26GvM1IcMlbZm3S7rAo/uwa2Cz/TW1lM6Ji/l
/D2p5Z+IcLjs0MiyTLDIPe8k6dEeAthcpvfV5nd0i+qxNEjSwbOXZscdt608ce4/
WFVW3lDErGUFwOloWOBz6bo=
-----END PRIVATE KEY-----`
*/

let PRIVATE_KEY = process.env.JAAS_PRIVATE_KEY
const PRIVATE_KEY_FILE = process.env.JAAS_PRIVATE_KEY_FILE
if (!PRIVATE_KEY && PRIVATE_KEY_FILE) {
  PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8')
}

if (!APP_ID || !KID || !PRIVATE_KEY) {
  console.error('[Server] Missing JAAS_APP_ID, JAAS_KID, or JAAS_PRIVATE_KEY(_FILE)')
  process.exit(1)
}

app.get('/health', (req, res) => res.json({ ok: true }))

// Minimal JWT endpoint: /api/jaas/token?room=<roomName>
app.get('/api/jaas/token', (req, res) => {
  const room = String(req.query.room || 'demo-room-123'); // ← 這行保持一致
  console.log('[JWT] issuing token for room =', room);     // ← 新增：印出房名

  const now = Math.floor(Date.now() / 1000)

  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: APP_ID,      // 固定用你的 App ID
    room,             // 可指定房名或 *
    nbf: now - 10,
    exp: now + 60 * 60, // 1 小時
    context: {
      user: {
        id: 'user-123',      // 依你的登入系統帶值
        name: 'Guest',
        moderator: 'true'    // 或 'false'
      }
    }
  }

  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    header: { kid: KID, typ: 'JWT' }
  })

  res.json({ token })
})

const PORT = process.env.PORT || 5174
app.listen(PORT, () => {
  console.log(`[Server] JAAS token server listening on :${PORT}`)
  console.log(`[Server] CORS allow origin: ${ALLOWED_ORIGIN}`)
})
