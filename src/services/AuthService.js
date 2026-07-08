import API from "./HttpService";

// Register user
export const registerUser = async (data) => {
  const response = await API.post("/api/auth/register", data);
  return response.data;
};

// Login user
export const loginUser = async (data) => {
  const response = await API.post("/api/auth/login", data);
  return response.data;
};