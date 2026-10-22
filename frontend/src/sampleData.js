// Same records as backend/sample-data/apis.json, used by the "Run sample" button.
export const sampleRecords = [
  { api_name: 'PatientDataAPI', response_time_ms: 1200, status_code: 200, records_returned: 50 },
  { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 },
  { api_name: 'BillingAPI', response_time_ms: 3800, status_code: 200, records_returned: 12 },
  { api_name: 'LabResultsAPI', response_time_ms: 900, status_code: 200, records_returned: 0 },
  { api_name: 'PharmacyAPI', response_time_ms: 700, status_code: 404, records_returned: 0 },
  { api_name: 'InsuranceAPI', response_time_ms: 450, status_code: 200, records_returned: 230 },
  { api_name: 'StaffRosterAPI', status_code: 200 },
];
