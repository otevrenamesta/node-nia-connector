# node [NIA](https://info.eidentita.cz/portal/) connector

NIA umožňuje autentikaci pomocí Indentity Provideru (IdP) komunikujícího
pomocí SAML2 protokolu.
Tato knihovna má za cíl nabídnout vyzkoušené řešení napojení na NIA IdP.

## nastavení na straně NIA

Nejjednodušší je kontaktovat [Marka Seberu](https://github.com/smarek),
který je ochoten založit "testovací SeP".
K tomu potřebuje veřejný certifikát "moje.crt" vašeho Sep,
adresu kde poběží, cestu k POST handleru odpovědi na přihlášení (assert_endpoint) a odhlášení.
Certifikát a k němu privátní klíč se dá udělat takto:

```
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout moje.key -out moje.crt
```

## inicializace

```
import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import NIA from 'nia-connector'

process.env.KEY_FILE = 'moje.key'
process.env.CERT_FILE = 'moje.crt'

const NIAConnector = new NIA({
  audience: 'https://vxk.pagekite.me/',
  private_key: fs.readFileSync(process.env.KEY_FILE).toString(),
  certificate: fs.readFileSync(process.env.CERT_FILE).toString(),
  assert_endpoint: 'https://vxk.pagekite.me/ExternalLogin'
})
```

Kompletní příklad použití viz. [testovací server](test/server.js).

## konfigurace

Pomocí ENVVARS:

- METADATA_URL: url IdP metadat. Default [testovaci NIA](https://tnia.eidentita.cz/fpsts/FederationMetadata/2007-06/FederationMetadata.xml)

## použití

```typescript
import fs from "fs";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import NIA from "../index.js";

const NIAConnector = new NIA({
  audience: process.env.AUDIENCE || "",
  private_key: fs.existsSync(process.env.KEY_FILE || "")
    ? fs.readFileSync(process.env.KEY_FILE!).toString()
    : "",
  certificate: fs.existsSync(process.env.CERT_FILE || "")
    ? fs.readFileSync(process.env.CERT_FILE!).toString()
    : "",
  assert_endpoint: process.env.ASSERT_ENDPOINT || "",
});

const user: any = {}; // global data

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// ------ Define express endpoints ------
app.get("/login", function (req: Request, res: Response, next: NextFunction) {
  const loginOpts = {
    attrs: [
      { name: NIA.PROFILEATTRS.PERSON_IDENTIFIER, required: true },
      { name: NIA.PROFILEATTRS.GIVEN_NAME, required: true },
      { name: NIA.PROFILEATTRS.FAMILY_NAME, required: false },
      { name: NIA.PROFILEATTRS.CURRENT_ADDRESS, required: true },
      { name: NIA.PROFILEATTRS.CZMORIS_TR_ADRESA_ID, required: true },
      { name: NIA.PROFILEATTRS.DATE_OF_BIRTH, required: true },
      { name: NIA.PROFILEATTRS.EMAIL, required: false },
      { name: NIA.PROFILEATTRS.CZMORIS_PHONE_NUMBER, required: true },
      { name: NIA.PROFILEATTRS.CZMORIS_ID_TYPE, required: true },
      { name: NIA.PROFILEATTRS.CZMORIS_ID_NUMBER, required: true },
    ],
    level: NIA.LOA.SUBSTANTIAL,
  };
  NIAConnector.createAuthRequestUrl(loginOpts)
    .then((loginUrl) => {
      res.redirect(loginUrl);
    })
    .catch(next);
});

app.post(
  "/ExternalLogin",
  function (req: Request, res: Response, next: NextFunction) {
    NIAConnector.postAssert(req.body)
      .then((samlResponse: any) => {
        Object.assign(user, samlResponse.user);
        res.json(samlResponse);
      })
      .catch(next);
  },
);

app.get("/logout", function (req: Request, res: Response, next: NextFunction) {
  const nameId = user.NameID;
  const sessionIndex = user.SessionIndex;
  NIAConnector.createLogoutRequestUrl(nameId, sessionIndex)
    .then((logoutUrl) => {
      res.redirect(logoutUrl);
    })
    .catch(next);
});

app.post(
  "/ExternalLogout",
  function (req: Request, res: Response, next: NextFunction) {
    try {
      const samlResponse = NIAConnector.logoutAssert(req.body);
      res.json(samlResponse);
    } catch (err) {
      next(err);
    }
  },
);

// ----------- error handler and listen -----------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(400).send(err.toString());
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`frodo do magic on ${PORT}`);
});
```
