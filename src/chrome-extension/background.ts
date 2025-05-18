const API_BASE_URL = "https://chikki-backend.vercel.app/api";
const AUTH_COOKIE_DOMAIN = "https://chikkiai.vercel.app";
const AUTH_COOKIE_NAME = "authToken";
// **** IMPORTANT: Replace with your actual API key. For production, this key should ideally be injected via a build process and not hardcoded directly in source control. ****
const API_KEY = "your-secure-api-key-here"; 
const DEFAULT_TOTAL_CREDITS = 100; // Default total credits if not provided by the API

interface UserApiResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  usage: number;
}

interface ApiSuccessResponse {
  success: true;
  data: {
    user: UserApiResponse;
  };
}

// Interface for what the popup expects
interface PopupDataResponse {
  username: string;
  creditsUsed: number;
  totalCredits: number;
  error?: string;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "GET_POPUP_DATA") {
    fetchPopupData()
      .then(sendResponse)
      .catch(error => {
        console.error("Critical error in fetchPopupData promise chain:", error);
        sendResponse({
          username: "Error",
          creditsUsed: 0,
          totalCredits: 0,
          error: "An unexpected error occurred while fetching user data."
        });
      });
    return true; // Indicates asynchronous response
  } else if (request.type === "GENERATE_TEXT") {
    if (typeof request.prompt === 'string') {
      generateText(request.prompt)
        .then(sendResponse)
        .catch(error => {
          console.error("Critical error in generateText promise chain:", error);
          sendResponse({ success: false, error: "An unexpected error occurred during text generation." });
        });
    } else {
      sendResponse({ success: false, error: "Invalid prompt provided." });
    }
    return true; // Indicates asynchronous response
  }
});

async function fetchPopupData(): Promise<PopupDataResponse> {
  try {
    const cookie = await chrome.cookies.get({
      url: AUTH_COOKIE_DOMAIN,
      name: AUTH_COOKIE_NAME,
    });

    if (!cookie) {
      const errorMessage = `Auth cookie "${AUTH_COOKIE_NAME}" not found on domain "${AUTH_COOKIE_DOMAIN}". Please log in to chikkiai.vercel.app.`;
      console.warn(errorMessage); // Use warn for non-critical but important operational messages
      return {
        username: "Error",
        creditsUsed: 0,
        totalCredits: 0,
        error: "Authentication token not found. Please log in to chikkiai.vercel.app."
      };
    }

    const authToken = cookie.value;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
        "X-API-Key": API_KEY,
      },
    });

    if (!response.ok) {
      let detailedErrorMessage = `API request to /auth/me failed with status: ${response.status}`;
      let userFacingError = `Failed to retrieve user data (Server Error: ${response.status}).`;
      try {
        const errorBody = await response.json();
        detailedErrorMessage += ` - ${errorBody.message || JSON.stringify(errorBody)}`;
        if (errorBody && errorBody.message) { // Provide a more specific message if available from API
            userFacingError = `Failed to retrieve user data: ${errorBody.message}`;
        }
      } catch (e) {
        detailedErrorMessage += ` - Unable to parse error response body.`;
      }
      console.error(detailedErrorMessage);
      return {
        username: "Error",
        creditsUsed: 0,
        totalCredits: 0,
        error: userFacingError
      };
    }

    const apiResponseData: ApiSuccessResponse = await response.json();

    if (apiResponseData && apiResponseData.success && apiResponseData.data && apiResponseData.data.user) {
      const user = apiResponseData.data.user;
      return {
        username: user.name || "User",
        creditsUsed: user.usage || 0,
        totalCredits: DEFAULT_TOTAL_CREDITS, // Use the constant
      };
    } else {
      console.error("API response format is not as expected for /auth/me:", apiResponseData);
      return {
        username: "Error",
        creditsUsed: 0,
        totalCredits: 0,
        error: "Invalid data format received from user API."
      };
    }

  } catch (error: any) {
    console.error("Failed to fetch popup data due to an unexpected error:", error);
    return {
      username: "Error",
      creditsUsed: 0,
      totalCredits: 0,
      error: error.message || "An unexpected error occurred while fetching your data."
    };
  }
}

async function generateText(prompt: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const cookie = await chrome.cookies.get({ url: AUTH_COOKIE_DOMAIN, name: AUTH_COOKIE_NAME });
    if (!cookie) {
      console.warn(`Auth cookie "${AUTH_COOKIE_NAME}" not found for text generation.`);
      return { success: false, error: "Authentication token not found. Please ensure you are logged in." };
    }
    const authToken = cookie.value;

    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
      let detailedErrorLog = `API /generate error ${response.status}`;
      let userFacingError = `Text generation failed (Server Error: ${response.status}).`;
      try {
        const errorData = await response.json().catch(() => null); // Gracefully handle non-JSON error responses
        if (errorData && errorData.message) {
            detailedErrorLog += `: ${errorData.message}`;
            userFacingError = `Text generation failed: ${errorData.message}`;
        } else if (errorData) {
            detailedErrorLog += `: ${JSON.stringify(errorData)}`;
        } else {
            detailedErrorLog += ": Failed to parse error response or empty error response.";
        }
      } catch (e) {
        // This catch is less likely to be hit due to .catch(() => null) above, but good for safety.
        detailedErrorLog += " - Error during error response processing.";
      }
      console.error(detailedErrorLog);
      return { success: false, error: userFacingError };
    }

    const responseData = await response.json();
    if (responseData && (typeof responseData.text === 'string' || typeof responseData.data === 'string')) {
        return { success: true, data: responseData.text || responseData.data };
    } else if (responseData && responseData.choices && responseData.choices[0] && typeof responseData.choices[0].text === 'string') {
        return { success: true, data: responseData.choices[0].text };
    } else {
        console.error("Unexpected response format from /api/generate:", responseData);
        return { success: false, error: "Received unexpected data format from generation API." };
    }

  } catch (error: any) {
    console.error("Failed to generate text due to an unexpected error:", error);
    return { success: false, error: error.message || "An unexpected error occurred during text generation." };
  }
}

console.log("Background script loaded. Ready for operations.");