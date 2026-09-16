import { NextResponse } from "next/server";
import { getDistanceInKm, CENTER_LOCATION } from "@/lib/location";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (!latStr || !lonStr) {
      return NextResponse.json({ error: "Latitude and longitude required" }, { status: 400 });
    }

    const lat = Number(latStr);
    const lon = Number(lonStr);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latStr)}&lon=${encodeURIComponent(lonStr)}`,
      {
        headers: {
          "User-Agent": "OatsAndCoApp/1.0",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to reverse geocode location" }, { status: 500 });
    }

    const data = await response.json();
    const addressObj = data.address || {};

    const locality =
      addressObj.suburb ||
      addressObj.neighbourhood ||
      addressObj.residential ||
      addressObj.village ||
      addressObj.town ||
      addressObj.city_district ||
      addressObj.city ||
      "Current Location";

    const displayAddress =
      data.display_name ||
      [locality, addressObj.city || addressObj.county, addressObj.state, addressObj.postcode]
        .filter(Boolean)
        .join(", ");

    const distanceInKm = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, lat, lon);
    const isWithinDeliveryRadius = distanceInKm <= CENTER_LOCATION.maxRadiusKm;

    return NextResponse.json(
      {
        locality,
        address: displayAddress,
        lat,
        lng: lon,
        distanceInKm: Math.round(distanceInKm * 100) / 100,
        isWithinDeliveryRadius,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Geocode API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch address" }, { status: 500 });
  }
}
