import { useState, useEffect } from 'react';

interface TimezoneInfo {
  timezone: string;
  offset: number;
  currentHour: number;
}

// Get timezone from browser (most reliable fallback)
function getBrowserTimezone(): TimezoneInfo {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const offset = -now.getTimezoneOffset() / 60;
  return {
    timezone,
    offset,
    currentHour: now.getHours(),
  };
}

export function useTimezone() {
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo>(getBrowserTimezone);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try IP-based detection first, fallback to browser
    const detectTimezone = async () => {
      try {
        // Use ipapi.co for IP-based timezone detection (free, no API key)
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.timezone) {
            // Calculate current hour in that timezone
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: data.timezone,
              hour: 'numeric',
              hour12: false,
            });
            const currentHour = parseInt(formatter.format(now), 10);
            
            setTimezoneInfo({
              timezone: data.timezone,
              offset: data.utc_offset ? parseFloat(data.utc_offset) : getBrowserTimezone().offset,
              currentHour,
            });
          }
        }
      } catch (error) {
        // Silently fallback to browser timezone
        console.log('IP timezone detection failed, using browser timezone');
      } finally {
        setIsLoading(false);
      }
    };

    detectTimezone();
  }, []);

  // Get current hour in user's timezone
  const getCurrentHour = (): number => {
    if (timezoneInfo.timezone) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezoneInfo.timezone,
        hour: 'numeric',
        hour12: false,
      });
      return parseInt(formatter.format(new Date()), 10);
    }
    return new Date().getHours();
  };

  // Get time of day based on detected timezone
  type TimeOfDay = 'morning' | 'midday' | 'evening';
  const getTimeOfDay = (): TimeOfDay => {
    const hour = getCurrentHour();
    if (hour < 11) return 'morning';
    if (hour < 18) return 'midday';
    return 'evening';
  };

  return {
    timezone: timezoneInfo.timezone,
    offset: timezoneInfo.offset,
    currentHour: getCurrentHour(),
    timeOfDay: getTimeOfDay(),
    isLoading,
  };
}
