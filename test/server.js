import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import NIA from '../index'

const NIAConnector = new NIA({
  audience: 'https://vxk.pagekite.me/',
  private_key: fs.readFileSync(process.env.KEY_FILE).toString(),
  certificate: fs.readFileSync(process.env.CERT_FILE).toString(),
  assert_endpoint: 'https://vxk.pagekite.me/ExternalLogin'
})

const user = {} // global data

var app = express()
app.use(bodyParser.urlencoded({ extended: true }))

// ------ Define express endpoints ------
app.get('/login', function (req, res, next) {
  const attrs = [
    NIA.PROFILEATTRS.GIVEN_NAME,
    NIA.PROFILEATTRS.AGE,
    NIA.PROFILEATTRS.CZMORIS_ID_TYPE,
    NIA.PROFILEATTRS.EMAIL
  ]
  NIAConnector.createAuthRequestUrl(attrs).then(loginUrl => {
    res.redirect(loginUrl)
  }).catch(next)
})

app.post('/ExternalLogin', function (req, res, next) {
  NIAConnector.postAssert(req.body).then(samlResponse => {
    Object.assign(user, samlResponse.user)
    res.json(samlResponse)
  }).catch(next)
})

app.get('/logout', function (req, res, next) {
  const nameId = user.NameID
  const sessionIndex = user.SessionIndex
  NIAConnector.createLogoutRequestUrl(nameId, sessionIndex).then(logoutUrl => {
    res.redirect(logoutUrl)
  }).catch(next)
})

app.post('/ExternalLogout', function (req, res, next) {
  try {
    const samlResponse = NIAConnector.logoutAssert(req.body)
    res.json(samlResponse)
  } catch (err) {
    next(err)
  }
})

// TODO: Endpoint to retrieve metadata
// app.get('/metadata.xml', function(req, res) {
//   res.type('application/xml')
//   res.send(sp.create_metadata())
// })

// ----------- error handler and listen -----------------
app.use((err, req, res, next) => {
  res.status(400).send(err.toString())
})

const PORT = process.env.PORT || 8080
app.listen(8080, (err) => {
  if (err) { throw err }
  console.log(`frodo do magic on ${PORT}`)
})
