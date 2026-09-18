// Haversine formula to calculate distance in kilometers between two GPS coordinates
export function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export const CENTER_LOCATION = {
  address: "Opposite Canara Bank, near Vasavi Medical Hall, K.N. Road, Tadepalligudem, 534101",
  lat: 16.8160691,
  lng: 81.5252954,
  maxRadiusKm: 10,
  outOfRangeMessage:
    "Delivery is available within a 10 KM radius of Opposite Canara Bank, near Vasavi Medical Hall, K.N. Road, Tadepalligudem, 534101. Unfortunately, your selected location is outside our delivery area, so we can’t deliver to this location.",
};

export function calculateDeliveryFee(distanceInKm) {
  if (distanceInKm == null || isNaN(distanceInKm)) return 0;
  if (distanceInKm <= 2) return 0;

  const km = Math.ceil(distanceInKm);
  if (km > 10) return null;

  return km * 10;
}

// Get current minutes in Indian Standard Time (IST, Asia/Kolkata)
export function getISTMinutes() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  let h = 0, m = 0;
  for (const part of parts) {
    if (part.type === "hour") h = parseInt(part.value, 10);
    if (part.type === "minute") m = parseInt(part.value, 10);
  }
  if (h === 24) h = 0;
  return h * 60 + m;
}

// Check if current IST time is within openTime and closeTime range
export function isTimeWithinRange(openTimeStr, closeTimeStr) {
  if (!openTimeStr || !closeTimeStr) return true;
  const currentMinutes = getISTMinutes();
  const [openH, openM] = openTimeStr.split(":").map(Number);
  const [closeH, closeM] = closeTimeStr.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes >= openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } else {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
}


