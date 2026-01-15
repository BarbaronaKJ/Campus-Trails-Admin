// Get API base URL from environment or use default
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const getApiBaseUrl = () => {
  return BASE_API_URL;
};
