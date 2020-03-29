# node [NIA](https://info.eidentita.cz/portal/) connector

NIA umožňuje autentikaci pomocí Indentity Provideru (IdP) komunikujícího
pomocí SAML2 protokolu.
Tato knihovna má za cíl nabídnout vyzkoušené řešení napojení na NIA IdP.

## inicializace

```
import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import NIA from 'nia-connector'

const NIAConnector = new NIA({
  audience: 'https://vxk.pagekite.me/',
  entity_id: 'https://vxk.pagekite.me',
  private_key: fs.readFileSync(process.env.KEY_FILE).toString(),
  certificate: fs.readFileSync(process.env.CERT_FILE).toString(),
  assert_endpoint: 'https://vxk.pagekite.me/ExternalLogin'
})
```

Kompletní příklad použití viz. [testovací server](test/server.js).
