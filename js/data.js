/**
 * WAYFIND DATA STORE
 * Demonstrates real, plausible travel scenarios with primary focus on Abuja, Nigeria
 * and secondary destinations (Lagos, Obudu, Cape Town).
 */

const WAYFIND_DATA = {
  // --- Featured Destinations ---
  destinations: [
    {
      id: "abuja",
      name: "Abuja",
      country: "Nigeria",
      tagline: "Serene Monoliths, Lush Parks & Contemporary Art",
      description: "Nigeria’s purpose-built capital combines wide tree-lined boulevards, dramatic granite monoliths like Zuma Rock, peaceful waters at Jabi Lake, and vibrant emerging art galleries.",
      badge: "Primary Showcase",
      image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80",
      heroImage: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=80",
      avgBudgetPerDay: "$85 - $140",
      currency: "NGN (₦)",
      bestTimeToVisit: "November – March",
      highlights: ["Jabi Lake Boat Club", "Millennium Park", "Thought Pyramid Art Centre", "Gurara Falls", "Zuma Rock Viewpoint"],
      recommendedStyles: ["Culture", "Nature & Leisure", "Romantic", "Solo Explorer"]
    },
    {
      id: "lagos",
      name: "Lagos",
      country: "Nigeria",
      tagline: "High-Energy Coastline, Art Galleries & Culinary Pulse",
      description: "Africa's cultural and commercial powerhouse, pulsing with Afrobeat, world-class galleries like Nike Art, oceanfront lounges, and iconic canopy walks.",
      badge: "Cultural Hotspot",
      image: "https://images.unsplash.com/photo-1577975882846-431adc8c2009?auto=format&fit=crop&w=800&q=80",
      avgBudgetPerDay: "$95 - $160",
      currency: "NGN (₦)",
      bestTimeToVisit: "October – April",
      highlights: ["Nike Art Gallery Lekki", "Lekki Conservation Canopy", "Tarkwa Bay Beach", "Victoria Island Dining"],
      recommendedStyles: ["Nightlife", "Art & Food", "Friends"]
    },
    {
      id: "obudu",
      name: "Obudu Plateau",
      country: "Nigeria",
      tagline: "Misty Mountain Peaks & Temperate Alpine Retreat",
      description: "Perched 1,576 meters above sea level in Cross River State, Obudu offers sub-tropical mountain air, cable cars sweeping over lush valleys, and serene waterfall trails.",
      badge: "Mountain Sanctuary",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      avgBudgetPerDay: "$70 - $120",
      currency: "NGN (₦)",
      bestTimeToVisit: "October – February",
      highlights: ["Canopy Walkway", "Holy Mountain Views", "Becheve Nature Reserve", "Grotto Cascades"],
      recommendedStyles: ["Nature & Leisure", "Romantic", "Wellness"]
    },
    {
      id: "cape-town",
      name: "Cape Town",
      country: "South Africa",
      tagline: "Dramatic Ocean Vistas & Table Mountain Peaks",
      description: "Where rugged mountains drop into two colliding oceans. A world capital for hiking, coastal drives, botanical splendor, and farm-to-table dining.",
      badge: "International Escape",
      image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80",
      avgBudgetPerDay: "$110 - $190",
      currency: "ZAR (R)",
      bestTimeToVisit: "December – March",
      highlights: ["Table Mountain Cableway", "Kirstenbosch Gardens", "Camps Bay Sunset", "Boulders Beach Penguins"],
      recommendedStyles: ["Adventure", "Vacation", "Partner"]
    }
  ],

  // --- Primary Detailed Sample Itinerary (Abuja 4-Day Curated Experience) ---
  initialTrip: {
    id: "trip-abuja-001",
    title: "Abuja: Capital Art & Nature Retreat",
    destination: "Abuja, Nigeria",
    dates: "Nov 12 – Nov 15, 2026",
    duration: "4 Days / 3 Nights",
    travelers: "2 Adults",
    travelStyle: "Culture & Nature Leisure",
    budgetTotalUSD: 365,
    budgetTotalNGN: 310000,
    status: "Confirmed Plan",
    coverImage: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80",
    days: [
      {
        dayNumber: 1,
        title: "Arrival, Lakeside Unwind & Sunset",
        date: "Thursday, Nov 12",
        activities: [
          {
            id: "act-1-1",
            time: "10:30 AM",
            title: "Arrive at Nnamdi Azikiwe Airport (ABV)",
            location: "Airport Road, Abuja",
            category: "Transport",
            costNGN: 18000,
            costUSD: 22,
            duration: "1h 15m",
            notes: "Private pre-booked airport transfer to hotel via express highway.",
            image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Optimized Route"
          },
          {
            id: "act-1-2",
            time: "12:00 PM",
            title: "Check-in at Fraser Suites / Wells Carlton",
            location: "Central Area / Asokoro, Abuja",
            category: "Stay",
            costNGN: 48000,
            costUSD: 58,
            duration: "1h 30m",
            notes: "Freshen up, enjoy terrace welcome drinks overlooking the city skyline.",
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: "act-1-3",
            time: "1:45 PM",
            title: "Welcome Lunch at Nkoyo or Jollof Bistro",
            location: "Bathurst Street, Kado / Wuse 2",
            category: "Food",
            costNGN: 16000,
            costUSD: 20,
            duration: "1h 15m",
            notes: "Authentic Nigerian delicacies: charcoal-grilled tilapia, fragrant party jollof, and freshly squeezed Chapman.",
            image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Local Culinary Favorite"
          },
          {
            id: "act-1-4",
            time: "4:00 PM",
            title: "Kayaking & Sunset at Jabi Lake Boat Club",
            location: "Alex Ekwueme Way, Jabi, Abuja",
            category: "Activity",
            costNGN: 12000,
            costUSD: 15,
            duration: "2h 30m",
            notes: "Rent tandem kayaks, take scenic waterfront photography, and enjoy fresh breeze as the sun dips over the lake.",
            image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Weather-Adaptive Timing"
          },
          {
            id: "act-1-5",
            time: "7:30 PM",
            title: "Starlight Dinner at Cilantro / Wuse Dining",
            location: "Maitama Amusement Park Grounds",
            category: "Food",
            costNGN: 22000,
            costUSD: 26,
            duration: "2h",
            notes: "Relaxed open-air garden seating under soft fairy lights with fusion grills and mocktails.",
            image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
          }
        ]
      },
      {
        dayNumber: 2,
        title: "Artisan Galleries, Craft Village & Botanical Stroll",
        date: "Friday, Nov 13",
        activities: [
          {
            id: "act-2-1",
            time: "9:00 AM",
            title: "Artisan Breakfast at The Pavillion",
            location: "Wuse 2, Abuja",
            category: "Food",
            costNGN: 10000,
            costUSD: 12,
            duration: "1h",
            notes: "Sourdough toast, tropical fruit bowls, and rich African single-origin coffee.",
            image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: "act-2-2",
            time: "10:30 AM",
            title: "Thought Pyramid Art Centre & Nike Art Gallery Abuja",
            location: "Libreville Street, Wuse 2",
            category: "Culture",
            costNGN: 6000,
            costUSD: 7,
            duration: "2h",
            notes: "Explore avant-garde African installations, modern oil paintings, and wood carvings.",
            image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Curated for Anabel's Persona"
          },
          {
            id: "act-2-3",
            time: "1:00 PM",
            title: "Abuja Arts & Crafts Village",
            location: "Central Business District (CBD)",
            category: "Culture",
            costNGN: 15000,
            costUSD: 18,
            duration: "1h 30m",
            notes: "Meet local leather artisans, bead makers, and bronze sculptors. Perfect for handmade souvenirs.",
            image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: "act-2-4",
            time: "3:30 PM",
            title: "Mindful Stroll through Millennium Park",
            location: "Maitama District, Abuja",
            category: "Nature",
            costNGN: 4000,
            costUSD: 5,
            duration: "2h",
            notes: "Designed by Italian architect Manfredi Nicoletti; expansive fountains, indigenous flora, and view of Aso Rock.",
            image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Peaceful & Shaded"
          },
          {
            id: "act-2-5",
            time: "7:00 PM",
            title: "Social Evening at Bature Brewery",
            location: "Adetokunbo Ademola Crescent, Wuse 2",
            category: "Nightlife",
            costNGN: 18000,
            costUSD: 21,
            duration: "2h 30m",
            notes: "West Africa's pioneering craft micro-brewery; live indie acoustic session and artisanal woodfired pizzas.",
            image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80"
          }
        ]
      },
      {
        dayNumber: 3,
        title: "Day Excursion: Gurara Waterfalls & Zuma Monolith",
        date: "Saturday, Nov 14",
        activities: [
          {
            id: "act-3-1",
            time: "8:00 AM",
            title: "Scenic Countryside Drive to Gurara Falls",
            location: "Suleja – Minna Road, Niger State (65km from Abuja)",
            category: "Transport",
            costNGN: 25000,
            costUSD: 30,
            duration: "1h 30m",
            notes: "Private air-conditioned SUV transfer through picturesque savannah hills.",
            image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Best Early Morning Lighting"
          },
          {
            id: "act-3-2",
            time: "10:00 AM",
            title: "Guided Gorge Walk & Waterfall Photography",
            location: "Gurara Nature Reserve",
            category: "Nature",
            costNGN: 8000,
            costUSD: 10,
            duration: "2h 30m",
            notes: "Walk along the roaring freshwater cascades and tranquil rock pools with certified nature guides.",
            image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Top Nature Highlight"
          },
          {
            id: "act-3-3",
            time: "1:00 PM",
            title: "Riverbank Gourmet Picnic",
            location: "Gurara Shaded Pavilions",
            category: "Food",
            costNGN: 14000,
            costUSD: 17,
            duration: "1h 30m",
            notes: "Packed artisan lunch: grilled chicken skewers, plantain chips, jollof parcels, and chilled zobo tea.",
            image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: "act-3-4",
            time: "3:30 PM",
            title: "Zuma Rock Viewpoint & Cultural Photo Stop",
            location: "Abuja-Kaduna Highway",
            category: "Sightseeing",
            costNGN: 3000,
            costUSD: 4,
            duration: "1h",
            notes: "Stand before Nigeria's majestic 725m natural monolith with iconic human face contours in the rock face.",
            image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: "act-3-5",
            time: "7:30 PM",
            title: "Dinner & Rooftop Views at The Vue",
            location: "Novare Central, Wuse Zone 5",
            category: "Food",
            costNGN: 24000,
            costUSD: 28,
            duration: "2h",
            notes: "Upscale pan-Asian rooftop dining overlooking the night lights of the capital city.",
            image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80"
          }
        ]
      },
      {
        dayNumber: 4,
        title: "Usman Dam Reservoir Walk & Farewell Departure",
        date: "Sunday, Nov 15",
        activities: [
          {
            id: "act-4-1",
            time: "8:30 AM",
            title: "Morning Fresh Air Walk at Usman Dam",
            location: "Bwari Road, Ushafa",
            category: "Nature",
            costNGN: 5000,
            costUSD: 6,
            duration: "2h",
            notes: "Panoramic mountain-framed reservoir offering calm reflective waters and peaceful morning breeze.",
            image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
            aiBadge: "Gentle Morning Pace"
          },
          {
            id: "act-4-2",
            time: "11:30 AM",
            title: "Brunch & Specialty Coffee at Salamander Café",
            location: "Bujumbura Street, Wuse 2",
            category: "Food",
            costNGN: 12000,
            costUSD: 14,
            duration: "1h 30m",
            notes: "Popular literary cafe and garden with fresh waffles, eggs benedict, and literary magazine browsing.",
            image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
          },
          {
            id: "act-4-3",
            time: "1:30 PM",
            title: "Hotel Check-out & Airport Express Transfer",
            location: "Central Area to Nnamdi Azikiwe Airport",
            category: "Transport",
            costNGN: 18000,
            costUSD: 22,
            duration: "1h 15m",
            notes: "Comfortable air-conditioned ride to ABV airport with flight check-in reminders in the app.",
            image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80"
          }
        ]
      }
    ],

    // --- Categorized Budget ---
    budgetBreakdown: [
      { category: "Accommodation", allocatedNGN: 144000, allocatedUSD: 170, color: "#3B4A20", percent: 46 },
      { category: "Dining & Food", allocatedNGN: 74000, allocatedUSD: 87, color: "#5A7E64", percent: 24 },
      { category: "Transport & Transit", allocatedNGN: 51000, allocatedUSD: 60, color: "#8DB48E", percent: 16 },
      { category: "Activities & Culture", allocatedNGN: 41000, allocatedUSD: 48, color: "#D87D4A", percent: 14 }
    ]
  },

  // --- Secondary Sample Trip (For Saved Trips View) ---
  savedTrips: [
    {
      id: "trip-qatar-002",
      title: "Qatar: Modern Skyline & Desert Dune Safari",
      destination: "Doha, Qatar",
      dates: "July 25 – 31, 2026",
      duration: "7 Days",
      travelers: "1 Adult (Solo)",
      travelStyle: "Luxury & Culture",
      budgetTotalUSD: 1250,
      budgetTotalNGN: 1060000,
      status: "Past Itinerary",
      coverImage: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "trip-lagos-003",
      title: "Lagos: Art, Atlantic Breeze & Nightlife",
      destination: "Lagos, Nigeria",
      dates: "August 3 – 9, 2026",
      duration: "7 Days",
      travelers: "2 Adults",
      travelStyle: "Culture & Culinary",
      budgetTotalUSD: 420,
      budgetTotalNGN: 357000,
      status: "Saved Draft",
      coverImage: "https://images.unsplash.com/photo-1577975882846-431adc8c2009?auto=format&fit=crop&w=600&q=80"
    }
  ],

  // --- Pre-configured AI Chatbot Knowledge Base & Intent Responses ---
  chatbotIntents: [
    {
      keywords: ["jollof", "restaurant", "food", "eat", "lunch", "dinner", "dining"],
      reply: "For exceptional Nigerian cuisine in Abuja, I highly recommend **Nkoyo** in Kado (famous for charcoal-smoked catfish and party jollof) or **The Charcoal Grill** in Wuse 2. If you fancy upscale fusion with lakeside breeze, **Jabi Boat Club Restaurant** has splendid evening views!"
    },
    {
      keywords: ["nike art", "saturday", "art", "gallery", "thought pyramid", "culture"],
      reply: "Great choice! Thought Pyramid Art Centre and Nike Art Gallery Abuja feature stellar contemporary West African works. I can easily swap your Day 2 schedule to place the art gallery visit on Saturday afternoon at 2:00 PM. Would you like me to update your itinerary?"
    },
    {
      keywords: ["gurara", "waterfall", "falls", "nature", "zuma", "rock"],
      reply: "Gurara Falls is about 65km outside Abuja (approx. 1h 20m drive). The water volume is majestic and the surrounding gorge is peaceful. Visiting in the early morning around 10:00 AM avoids midday heat and provides golden lighting for photography. On the way back, stopping at Zuma Rock completes the experience!"
    },
    {
      keywords: ["budget", "cost", "money", "naira", "price", "expensive"],
      reply: "Your current 4-day Abuja itinerary estimates **₦310,000 (~$365 USD)** for two adults, covering boutique stay, private transfers, dining, and activity admissions. You can dial down lodging in the Budget Overview tab to save up to 25%."
    },
    {
      keywords: ["weather", "rain", "sun", "hot", "season"],
      reply: "Abuja typically enjoys warm tropical weather with sunny mornings. The dry season (November to March) offers clear blue skies and pleasant evening breezes—ideal for outdoor walking around Millennium Park and kayaking on Jabi Lake."
    }
  ],
  defaultChatbotReply: "I'm your **Wayfind AI Travel Companion**! I can adapt your itinerary in real time, swap activities, find hidden culinary spots, or check estimated budgets for your trip in Abuja or beyond. How may I assist your journey?"
};
