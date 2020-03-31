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
