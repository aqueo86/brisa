# Brisa · Finanzas personales

Aplicación web en español con presupuesto en COP, registro de ingresos y gastos, aportes a metas, gráficas mensuales e importación asistida de textos TXT/XML.

## Uso

El ejemplo se puede explorar sin guardar datos. «Usar mis datos» abre la cuenta privada. La identidad de ChatGPT se valida en el servidor y todos los registros pertenecen al usuario autenticado. Google/Apple y la recepción automática de correos/SMS están pendientes de integración; la interfaz indica estas limitaciones.

El plan mensual es editable y se aplica a todos los meses. Los aportes a metas son asignaciones registradas, no transferencias bancarias. El disponible es flujo mensual, no saldo bancario verificado.

## Validación

`node scripts/check-finance.mjs` comprueba cálculos, importación, autenticación y CRUD contra la vista local en localhost:5173. Usa exclusivamente datos ficticios, que elimina al terminar. El inicio de sesión de ensayo solo existe en desarrollo. Las consultas se filtran por el identificador de usuario del servidor.

La base de datos D1 utiliza migraciones generadas en drizzle/. No modificar una migración publicada.

## Referencia educativa

https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/teach/activities/analyzing-budgets/
