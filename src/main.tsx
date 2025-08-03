import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AgChartsEnterpriseModule } from 'ag-charts-enterprise';
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule,} from 'ag-grid-enterprise';
import './index.css'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'



ModuleRegistry.registerModules([
  AllEnterpriseModule.with(AgChartsEnterpriseModule),
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
