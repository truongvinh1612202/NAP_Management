# Table Data View Application Plan (Revised for ag-Grid Enterprise)

## Notes
- The project uses Electron, Vite, and React with TypeScript.
- Data views will be powered by ag-Grid Enterprise to leverage its high-performance Server-Side Row Model (SSRM).
- The application will support scalable features: complex server-side querying, lazy loading, pagination, sorting, and advanced filtering, all managed by ag-Grid.
- Components should be modular to allow for future feature expansion (e.g., custom ag-Grid cell renderers, filters).
- Separation of concerns remains key: database logic (main), IPC layer, and UI components (renderer).

## Possible Enhancements (Leveraging ag-Grid Enterprise)
- Advanced Filtering: Implement the built-in Advanced Filter or create custom filter components for a richer user experience.
- Row Grouping & Aggregation: Utilize the SSRM's ability to perform server-side row grouping and aggregations for powerful data analysis directly within the grid.
- Excel Export: Integrate the built-in Excel export feature, allowing users to download styled, native XLSX files of the grid data.
- Integrated Charting: Add data visualization capabilities by allowing users to create charts directly from their data selections within the grid.
- Custom Tool Panels: Develop custom side-bar panels for bespoke application controls (e.g., saved searches, detailed analytics).

## Task List
- [ ] Design scalable folder structure, accommodating shared types, services, and dedicated ag-Grid view components.
- [ ] Implement database service to handle paginated and sorted queries. Methods must be designed to accept `ag-Grid`'s SSRM request parameters (`startRow`, `endRow`, `sortModel`, `filterModel`, `rowGroupCols`, etc.).
- [ ] Set up main process IPC handlers to receive SSRM requests from the renderer, execute the corresponding database service queries, and return data in the format ag-Grid expects (`rowsThisBlock`, `lastRow`).
- [ ] Create API service in the renderer process to wrap IPC communication, providing a clean interface for ag-Grid's datasource to request data from the main process.
- [ ] Define shared TypeScript types for the SSRM request (`IServerSideGetRowsRequest`) and the response payload.
- [ ] Implement ag-Grid Enterprise license key activation within the application startup.
- [ ] Build core `DataGrid` component
- [ ] Integrate the `<AgGridReact />` component with enterprise features enabled
- [ ] Implement the `IServerSideDatasource` interface, connecting it to the renderer's API service
- [ ] Configure the grid to use the Server-Side Row Model (`rowModelType: 'serverSide'`)
- [ ] Define default column properties (`colDef`) for sorting, filtering, and resizing
- [ ] Style the grid using a pre-built theme (e.g., `ag-theme-alpine-dark`) and customize with Tailwind CSS utility classes or CSS variables for a consistent look and feel
- [ ] Implement UI controls for interacting with the grid, such as a global search bar that updates the grid's filter model and triggers a data reload
- [ ] Integrate the `DataGrid` component into the application layout and perform end-to-end testing of the data flow, from user interaction (sorting, filtering) to the database and back.

## Current Goal
Design scalable folder and file structure for new components/services. Implement the core `DataGrid` component using `ag-Grid Enterprise` and its Server-Side Row Model, ensuring a robust and performant data flow from the backend database to the UI.