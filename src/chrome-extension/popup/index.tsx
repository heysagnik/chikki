import { AudioLines, BookHeart, ChevronRight, Languages, LifeBuoy, Loader2, AlertTriangle} from "lucide-react"; // Added Cpu icon
import { useEffect, useState, useCallback } from "react";
import "../global.css";

interface PopupData {
  username: string;
  creditsUsed: number;
  totalCredits: number;
  error?: string; // To receive error messages from background
}

export const Popup = () => {
  const [data, setData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    setData(null); // Clear previous data/errors on new fetch attempt

    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "GET_POPUP_DATA" }, (response: PopupData | undefined) => {
        if (chrome.runtime.lastError) {
          console.error("Error fetching popup data from background:", chrome.runtime.lastError.message);
          setData({
            username: "Error",
            creditsUsed: 0,
            totalCredits: 0,
            error: `Extension error: ${chrome.runtime.lastError.message}`,
          });
        } else if (response) {
          setData(response);
        } else {
          setData({
            username: "Error",
            creditsUsed: 0,
            totalCredits: 0,
            error: "No response or invalid response from background script.",
          });
        }
        setLoading(false);
      });
    } else {
      console.warn("chrome.runtime.sendMessage is not available. Using mock error data for UI.");
      setData({
        username: "N/A",
        creditsUsed: 0,
        totalCredits: 0,
        error: "Chrome API not available (not in extension context).",
      });
      setLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is stable due to its own useCallback

  const settingsItems = [
    { id: "personalization", label: "Personalization", icon: <BookHeart className="w-6 h-6 text-gray-500" /> },
    { id: "language", label: "Language", icon: <Languages className="w-6 h-6 text-gray-500" /> },
    { id: "tone", label: "Tone of Voice", icon: <AudioLines className="w-6 h-6 text-gray-500" /> },
    { id: "support", label: "Support", icon: <LifeBuoy className="w-6 h-6 text-gray-500" /> },
  ];

  if (loading) {
    return (
      <div className="w-80 min-h-[520px] bg-gray-50 text-gray-800 p-5 flex flex-col justify-center items-center font-sans no-scrollbar">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-600">Loading Your Data...</p>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="w-80 min-h-[520px] bg-gray-50 text-gray-800 p-5 flex flex-col justify-center items-center text-center font-sans no-scrollbar">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Data</h2>
        <p className="text-sm text-gray-600 mb-4">
          {data?.error || "An unknown error occurred."}
        </p>
        {data?.error?.includes("Authentication token not found") && (
            <p className="text-xs text-gray-500 mb-4">
                Please ensure you are logged in to <a href="https://chikkiai.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">chikkiai.vercel.app</a>.
            </p>
        )}
        <button
          onClick={fetchData} // Use the refactored fetchData function
          className="mt-2 px-3 py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-50 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const { username, creditsUsed, totalCredits } = data;

  return (
    <div className="w-80 min-h-[520px] bg-gray-50 text-gray-800 p-5 flex flex-col font-sans no-scrollbar">
      <header className="mb-8">
        <div className="flex justify-center items-center h-20 bg-gray-100 rounded-xl mb-6 shadow-sm">
          <span className="text-gray-600 text-lg font-bold">Your Logo</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome Back, {username}!
          </h1>
        </div>
      </header>

      <main className="flex-grow flex flex-col space-y-7">
        <section aria-labelledby="credits-heading" className="bg-white p-5 rounded-2xl shadow-md">
          <h2 id="credits-heading" className="text-xs font-semibold text-gray-500 mb-1 tracking-wider uppercase">
            Credits Usage
          </h2>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-3xl font-bold text-gray-900">
              {creditsUsed}
            </span>
            <span className="text-md font-medium text-gray-500">/ {totalCredits}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: totalCredits > 0 ? `${(creditsUsed / totalCredits) * 100}%` : "0%" }}
              role="progressbar"
              aria-valuenow={creditsUsed}
              aria-valuemin={0}
              aria-valuemax={totalCredits}
              aria-label="Credits used progress"
            ></div>
          </div>
          {totalCredits > 0 && creditsUsed / totalCredits > 0.8 && (
            <p className="text-xs text-orange-500 mt-3 font-medium">
              You're using a significant portion of your credits. Consider upgrading!
            </p>
          )}
        </section>

        <section aria-labelledby="settings-heading">
          <h2 id="settings-heading" className="text-lg font-bold text-gray-900 mb-4 px-1">
            Settings
          </h2>
          <div className="space-y-2.5"> {/* Adjusted space-y for new padding */}
            {settingsItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full bg-white p-3 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 focus-visible:border-blue-500 flex justify-between items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 transition-colors duration-150 group"
              >
                <div className="flex items-center space-x-3"> {/* Adjusted space-x */}
                  {item.icon}
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-800 transition-colors"> {/* Changed text-md to text-sm */}
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-auto pt-8 text-center">
        <p className="text-xs text-gray-500">App Version 1.0.0</p>
      </footer>
    </div>
  );
};