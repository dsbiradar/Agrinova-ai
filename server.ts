import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Increase payload limits for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY" && geminiApiKey.trim() !== "") {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Successfully initialized GoogleGenAI client.");
  } catch (err) {
    console.error("Error initializing GoogleGenAI client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not set or using placeholder. Running in high-fidelity demo fallback mode.");
}

// Ensure the helper endpoints work and handle fallback logic
const handleAiFallback = (feature: string, inputs: any) => {
  console.log(`Using high-fidelity fallback generator for: ${feature}`);
  
  if (feature === "disease") {
    const crop = inputs.crop || "Crop";
    const diseases: Record<string, any> = {
      tomato: {
        diseaseName: "Tomato Late Blight (Phytophthora infestans)",
        confidence: 94,
        nutrientDeficiency: "Slight Nitrogen deficiency noticed in surrounding foliage.",
        pestIdentification: "No significant insect pests detected on this leaf sample.",
        symptoms: [
          "Dark, water-soaked spots on leaf tips and margins",
          "White fungal-like growth on leaf undersides in humid conditions",
          "Rapid browning and shriveling of affected leaves",
          "Dark brown lesions on leaf stems and plant petioles"
        ],
        organicTreatments: [
          "Apply copper-based organic fungicides immediately",
          "Prune and safely destroy infected lower leaves",
          "Spray neem oil solution to suppress spore distribution",
          "Enhance soil aeration with compost tea mulching"
        ],
        chemicalTreatments: [
          "Apply Chlorothalonil or Mancozeb-based preventive fungicides",
          "Apply systemic fungicides containing Mefenoxam for active outbreaks"
        ],
        preventionGuidelines: [
          "Water early in the day directly at the soil line to keep leaves dry",
          "Maintain proper crop spacing to maximize wind airflow",
          "Rotate crops annually with non-solanaceous species",
          "Plant certified disease-resistant tomato cultivars next season"
        ],
        recoveryPrediction: "Highly favorable (85% recovery chance) if treatments start within 48 hours."
      },
      rice: {
        diseaseName: "Rice Blast (Magnaporthe oryzae)",
        confidence: 89,
        nutrientDeficiency: "Moderate Potassium deficiency, weakening the plant immune response.",
        pestIdentification: "Slight evidence of leaf folder activity.",
        symptoms: [
          "Spindle-shaped or diamond-shaped lesions with grey/white centers",
          "Brownish borders on lesions expanding rapidly along veins",
          "Neck rot causing panicles to fall over and dry up"
        ],
        organicTreatments: [
          "Apply botanical extracts of neem (Azadirachta indica) or garlic juice",
          "Apply Trichoderma-based bio-fungicides to soil and crops",
          "Avoid excessive nitrogenous fertilization during early growth phases"
        ],
        chemicalTreatments: [
          "Foliar spray of Tricyclazole 75% WP or Isoprothiolane 40% EC",
          "Apply Azoxystrobin or Carbendazim-based fungicides if neck blast occurs"
        ],
        preventionGuidelines: [
          "Provide balanced fertilizer dosage, especially boosting Silicon and Potassium",
          "Maintain continuous but regulated water level without water logging",
          "Sow certified blast-resistant seed batches"
        ],
        recoveryPrediction: "Moderate recovery chance (65%) depends heavily on nitrogen management and spray timing."
      },
      default: {
        diseaseName: "Leaf Spot & Early Blight Complex",
        confidence: 85,
        nutrientDeficiency: "Mild nutrient imbalance detected, check soil NPK parameters.",
        pestIdentification: "Aphid colonies beginning to cluster underneath leaves.",
        symptoms: [
          "Small circular brown lesions with concentric target-board rings",
          "Chlorosis (yellowing) spreading outwards from spot edges",
          "Premature defoliation of lower canopy layers"
        ],
        organicTreatments: [
          "Spray diluted baking soda and organic liquid soap solution",
          "Spray cold-pressed neem oil to control both spores and aphid vectors",
          "Prune off bottom 4 inches of leaves to prevent soil-splash infection"
        ],
        chemicalTreatments: [
          "Apply broad-spectrum copper fungicides",
          "Spray Mancozeb or Daconil brand preventive solutions"
        ],
        preventionGuidelines: [
          "Implement drip irrigation instead of overhead sprinklers",
          "Mulch soil around base of plants to create a barrier against soil pathogens",
          "Clean all pruning shears with rubbing alcohol between plants"
        ],
        recoveryPrediction: "Excellent (90% recovery chance) if infected leaves are pruned off and copper spray is applied immediately."
      }
    };
    
    const cropKey = crop.toLowerCase();
    return diseases[cropKey] || diseases.default;
  }
  
  if (feature === "soil") {
    const ph = parseFloat(inputs.ph) || 6.5;
    const moisture = parseFloat(inputs.moisture) || 45;
    
    let fertilityScore = 78;
    let nLevel = "Optimal";
    let pLevel = "Low";
    let kLevel = "Optimal";
    let cropSuitability = ["Corn", "Soybeans", "Tomatoes", "Potatoes"];
    
    if (ph < 5.5) {
      fertilityScore = 55;
      nLevel = "Low";
      cropSuitability = ["Blueberries", "Potatoes", "Sweet Potatoes", "Oats"];
    } else if (ph > 7.5) {
      fertilityScore = 60;
      kLevel = "Low";
      cropSuitability = ["Alfalfa", "Barley", "Sugar Beets", "Cabbage"];
    }
    
    return {
      fertilityScore,
      nitrogenLevel: nLevel,
      phosphorusLevel: pLevel,
      potassiumLevel: kLevel,
      moistureInsight: moisture < 30 ? "Soil is critically dry. Root activity restricted. Needs immediate watering." : moisture > 80 ? "Waterlogged conditions. Risk of root rot and anaerobic soil conditions." : "Ideal soil moisture level supporting healthy microbial activity.",
      phEvaluation: ph < 5.5 ? `Highly Acidic (pH ${ph}). Restricts phosphorus absorption.` : ph > 7.5 ? `Alkaline (pH ${ph}). Reduces iron and manganese availability.` : `Slightly Acidic to Neutral (pH ${ph}). The golden range for nutrient availability.`,
      fertilizerRecommendations: ph < 5.5 ? [
        "Apply Agricultural Lime (Calcium Carbonate) at 50 lbs per 1000 sq ft to raise pH.",
        "Add well-rotted compost to increase organic buffer capacity.",
        "Use Bone Meal to boost deficient Phosphorus without raising acidity."
      ] : ph > 7.5 ? [
        "Incorporate Elemental Sulfur to gradually lower pH into neutral range.",
        "Apply ammonium sulfate to provide nitrogen while lowering soil pH.",
        "Use organic mulch like pine needles or peat moss to release natural organic acids."
      ] : [
        "Apply balanced organic 10-10-10 fertilizer to maintain ideal nutrient levels.",
        "Add dynamic bio-fertilizers like Mycorrhizae to enhance nutrient uptake.",
        "Apply thin layer of organic compost to nourish soil micro-organisms."
      ],
      improvementRoadmap: [
        "Week 1: Conduct localized deep-tilling and blend recommended soil conditioners.",
        "Week 3: Lay organic straw mulch to retain moisture and foster earthworm activity.",
        "Week 6: Re-test pH and organic carbon index prior to scheduling subsequent fertilizer dosage.",
        "Pre-planting: Inoculate seeds with Rhizobium cultures if planting legumes."
      ],
      cropSuitability
    };
  }

  if (feature === "crop-recommendation") {
    const farmSize = inputs.farmSize || 10;
    return {
      recommendedCrops: [
        {
          name: "High-Yield Sweet Corn",
          expectedYield: "6.5 Tons / Acre",
          waterRequirement: "Moderate (22 inches throughout cycle)",
          costPerAcre: 450,
          expectedProfit: 1250 * farmSize,
          riskLevel: "Low",
          marketDemandScore: 9,
          reason: "Soil organic content matches corn's high nitrogen requirement. Current regional market predicts high late-summer demand."
        },
        {
          name: "Organic Heirloom Tomatoes",
          expectedYield: "12 Tons / Acre",
          waterRequirement: "High (Requires regular drip irrigation)",
          costPerAcre: 1200,
          expectedProfit: 3100 * farmSize,
          riskLevel: "Medium",
          marketDemandScore: 8,
          reason: "High profit yield. Your clay-loam soil type holds the perfect moisture balance for tomato root development."
        },
        {
          name: "Golden Soybeans",
          expectedYield: "2.8 Tons / Acre",
          waterRequirement: "Low (Very drought tolerant once established)",
          costPerAcre: 320,
          expectedProfit: 850 * farmSize,
          riskLevel: "Low",
          marketDemandScore: 10,
          reason: "Excellent crop rotation choice. Soybeans fix atmospheric nitrogen, naturally boosting soil fertility for future seasons."
        }
      ]
    };
  }

  if (feature === "price-predictor") {
    const cropName = inputs.cropName || "Corn";
    const currentPrice = cropName.toLowerCase().includes("tomato") ? 2800 : cropName.toLowerCase().includes("rice") ? 2200 : 1850;
    return {
      currentPrice,
      priceUnit: "per Ton",
      historicalTrend: [
        { month: "Jan", price: currentPrice - 300 },
        { month: "Feb", price: currentPrice - 200 },
        { month: "Mar", price: currentPrice - 100 },
        { month: "Apr", price: currentPrice },
        { month: "May", price: currentPrice + 150 },
        { month: "Jun", price: currentPrice + 100 }
      ],
      futureForecast: [
        { month: "Jul", price: currentPrice + 200, confidence: 92 },
        { month: "Aug", price: currentPrice + 450, confidence: 85 },
        { month: "Sep", price: currentPrice + 550, confidence: 78 },
        { month: "Oct", price: currentPrice + 300, confidence: 82 },
        { month: "Nov", price: currentPrice + 150, confidence: 88 },
        { month: "Dec", price: currentPrice + 50, confidence: 91 }
      ],
      demandForecast: "Supply shortages in southern states due to localized rain delays will trigger an 18% spike in local demand over the next 60 days.",
      bestTimeToSell: "Mid-August through September (predicted price peak)",
      nearbyMarkets: [
        { market: "Central Agro-Hub", price: currentPrice + 40, distance: "12 miles" },
        { market: "Metro Wholesalers Terminal", price: currentPrice + 95, distance: "34 miles" },
        { market: "District Farmer Cooperative", price: currentPrice - 15, distance: "6 miles" }
      ],
      insights: [
        `Historical analysis shows ${cropName} typically yields maximum profits during late summer.`,
        "Fuel inflation will likely increase transport costs to Metro terminal by 5%, so selling at Central Agro-Hub remains optimal.",
        "Consider drying crop and storing for an additional month to capture an extra 8% price premium."
      ]
    };
  }

  if (feature === "irrigation") {
    const crop = inputs.crop || "Corn";
    const moisture = inputs.soilMoisture || 40;
    return {
      waterRequirement: crop.toLowerCase().includes("rice") ? "4,500 Liters / Acre" : crop.toLowerCase().includes("tomato") ? "2,800 Liters / Acre" : "1,800 Liters / Acre",
      schedule: [
        { day: "Monday", action: "No Watering Required", amount: "0 L" },
        { day: "Tuesday", action: "Light Drip Irrigation", amount: "500 L / Acre" },
        { day: "Wednesday", action: "No Watering Required", amount: "0 L" },
        { day: "Thursday", action: "Moderate Drip Irrigation", amount: "800 L / Acre" },
        { day: "Friday", action: "No Watering Required", amount: "0 L" },
        { day: "Saturday", action: "Heavy Drip Irrigation", amount: "1200 L / Acre" },
        { day: "Sunday", action: "No Watering Required", amount: "0 L" }
      ],
      suggestions: [
        `Based on weather forecast (20% rain chance on Wed), delay mid-week watering sequence.`,
        "Apply a 2-inch straw mulch layer to reduce evaporative water loss from the topsoil by up to 35%.",
        "Water strictly during early morning (5:00 AM - 7:00 AM) to maximize soil infiltration."
      ],
      efficiencyScore: moisture > 35 && moisture < 65 ? 89 : 62,
      droughtAlert: moisture < 25 ? "Drought Warning! Crop is nearing permanent wilting point. Immediate irrigation recommended." : null
    };
  }

  if (feature === "business-insights") {
    const income = inputs.income || 25000;
    const expenses = inputs.expenses || 11000;
    const profit = income - expenses;
    const margin = Math.round((profit / (income || 1)) * 100);
    return {
      performanceScore: 84,
      pAndLSummary: `Operating profit margin is exceptionally healthy at ${margin}%. Your primary driver of cost is seed and fuel, while tomato sales account for 65% of gross revenue.`,
      yieldForecastInsight: "Excellent canopy indices suggest corn harvest will outperform historical records by 12.5%, yielding an extra $2,400 in unexpected profit.",
      growthInsights: [
        "Your chemical fertilizer expenditure is 14% higher than the district average. Transitioning to integrated soil nutrient regimes could save $650 per cycle.",
        "Installing the recommended soil moisture telemetry nodes will drop irrigation electric bills by 20% in the upcoming autumn period.",
        "Your profit margin ranks in the top 15% of regional farms. Reinvesting in multi-crop greenhouses is highly recommended to capture off-season high pricing."
      ],
      investmentRecommendations: [
        "Allocate $1,500 of current profit to purchase smart drip nozzles.",
        "Diversify next cycle by planting high-margin crops (e.g. Garlic, Strawberries) on 1.5 acres of underutilized land.",
        "Secure organic crop certification to qualify for a 25% price premium on next season's crop yield."
      ]
    };
  }

  return { success: true };
};

// --- API ENDPOINTS ---

// 1. Crop Disease & Plant Doctor
app.post("/api/ai/disease", async (req, res) => {
  const { imageBase64, crop, details } = req.body;
  if (!ai) {
    const fallback = handleAiFallback("disease", { crop });
    return res.json({ ...fallback, isMocked: true });
  }

  try {
    const prompt = `You are a world-class plant pathologist and crop disease expert. Analyze the attached plant/crop image. The farmer indicates this crop is a ${crop || "unknown plant"}. Additional context: ${details || "None"}.
    Identify any crop disease, nutrient deficiency, pest infestation, symptoms, organic treatments, chemical treatments, prevention guidelines, and recovery prediction.
    Provide your response STRICTLY as a JSON object with the following schema:
    {
      "diseaseName": "Name of the disease (be specific and include scientific name if applicable)",
      "confidence": (a number representing percentage confidence, e.g. 92),
      "nutrientDeficiency": "Description of any nutrient deficiencies noticed, or 'None detected'",
      "pestIdentification": "Description of any pests identified, or 'None detected'",
      "symptoms": ["Symptom 1", "Symptom 2", ...],
      "organicTreatments": ["Treatment 1", "Treatment 2", ...],
      "chemicalTreatments": ["Treatment 1", "Treatment 2", ...],
      "preventionGuidelines": ["Guideline 1", "Guideline 2", ...],
      "recoveryPrediction": "A detailed, reassuring prediction on how the crop will recover and the timeline"
    }
    Strictly output only valid, parseable JSON. Do not wrap in markdown or backticks.`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "";
    const parsedData = JSON.parse(resultText.trim());
    return res.json({ ...parsedData, isMocked: false });
  } catch (error) {
    console.error("Gemini disease analysis failed:", error);
    const fallback = handleAiFallback("disease", { crop });
    return res.json({ ...fallback, isMocked: true, error: (error as any).message });
  }
});

// 2. Soil Health Intelligence
app.post("/api/ai/soil", async (req, res) => {
  const { nitrogen, phosphorus, potassium, ph, moisture, location, soilType } = req.body;
  if (!ai) {
    const fallback = handleAiFallback("soil", { ph, moisture, soilType });
    return res.json({ ...fallback, isMocked: true });
  }

  try {
    const prompt = `You are a senior agronomist and soil science expert. Analyze the following soil properties:
    Nitrogen (N): ${nitrogen || "Unspecified"}
    Phosphorus (P): ${phosphorus || "Unspecified"}
    Potassium (K): ${potassium || "Unspecified"}
    pH Level: ${ph || "Unspecified"}
    Moisture Level: ${moisture || "Unspecified"}%
    Location/Region: ${location || "Unspecified"}
    Soil Texture/Type: ${soilType || "Unspecified"}

    Provide soil quality analysis, organic and chemical fertilizer recommendations, improvement roadmap, and ideal crop suitability.
    Provide your response STRICTLY as a JSON object with the following schema:
    {
      "fertilityScore": (fertility score out of 100, e.g. 78),
      "nitrogenLevel": "Low/Optimal/High evaluation",
      "phosphorusLevel": "Low/Optimal/High evaluation",
      "potassiumLevel": "Low/Optimal/High evaluation",
      "moistureInsight": "A clear, detailed description of what this moisture level implies and what to do",
      "phEvaluation": "Description of the pH level status (acidic, neutral, alkaline) and how it affects nutrient uptake",
      "fertilizerRecommendations": ["Recommendation 1", "Recommendation 2", ...],
      "improvementRoadmap": ["Step 1", "Step 2", "Step 3", "Step 4"],
      "cropSuitability": ["Crop 1", "Crop 2", "Crop 3", "Crop 4"]
    }
    Strictly output only valid, parseable JSON. Do not wrap in markdown or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = JSON.parse((response.text || "").trim());
    return res.json({ ...parsedData, isMocked: false });
  } catch (error) {
    console.error("Gemini soil analysis failed:", error);
    const fallback = handleAiFallback("soil", { ph, moisture, soilType });
    return res.json({ ...fallback, isMocked: true, error: (error as any).message });
  }
});

// 3. Smart Crop Recommendation & Profit Planner
app.post("/api/ai/crop-recommendation", async (req, res) => {
  const { location, soilType, farmSize, season, waterAvailability, weather } = req.body;
  if (!ai) {
    const fallback = handleAiFallback("crop-recommendation", { farmSize });
    return res.json({ ...fallback, isMocked: true });
  }

  try {
    const prompt = `You are an agricultural economist and farm financial planner. Recommend the most profitable and suitable crops to grow based on these inputs:
    Location: ${location || "Unspecified"}
    Soil Type: ${soilType || "Unspecified"}
    Farm Size: ${farmSize || 10} Acres
    Season: ${season || "Current"}
    Water Availability: ${waterAvailability || "Unspecified"}
    Current Weather/Climate: ${weather || "Unspecified"}

    Provide a list of the top 3 recommended crops, estimated yields, water requirements, costs per acre, total profit forecasts, risk levels, demand scores, and agronomical rationale.
    Provide your response STRICTLY as a JSON object with the following schema:
    {
      "recommendedCrops": [
        {
          "name": "Name of crop (e.g. Organic Heirloom Tomatoes)",
          "expectedYield": "Estimated yield per acre (e.g. 12 Tons / Acre)",
          "waterRequirement": "A short, descriptive note of water needs",
          "costPerAcre": (numerical farming cost per acre in USD, e.g. 1200),
          "expectedProfit": (numerical expected total net profit for the entire farm size in USD, e.g. 31000),
          "riskLevel": "Low/Medium/High",
          "marketDemandScore": (numerical rating from 1 to 10, e.g. 9),
          "reason": "Detailed scientific/economic reason for recommendation based on inputs"
        },
        ... (generate exactly 3)
      ]
    }
    Strictly output only valid, parseable JSON. Do not wrap in markdown or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = JSON.parse((response.text || "").trim());
    return res.json({ ...parsedData, isMocked: false });
  } catch (error) {
    console.error("Gemini crop recommendation failed:", error);
    const fallback = handleAiFallback("crop-recommendation", { farmSize });
    return res.json({ ...fallback, isMocked: true, error: (error as any).message });
  }
});

// 4. AI Market Price Predictor
app.post("/api/ai/price-predictor", async (req, res) => {
  const { cropName, region } = req.body;
  if (!ai) {
    const fallback = handleAiFallback("price-predictor", { cropName });
    return res.json({ ...fallback, isMocked: true });
  }

  try {
    const prompt = `You are a senior commodities market analyst specializing in agricultural trading. Analyze the market trends for the crop: ${cropName || "Corn"} in the region: ${region || "Unspecified"}.
    Provide live market prices estimation, historical trend prices, 6-month future forecasts, demand predictions, best selling windows, nearby market comparison, and actionable selling insights.
    Provide your response STRICTLY as a JSON object with the following schema:
    {
      "currentPrice": (current estimated wholesale price in USD, e.g. 1850),
      "priceUnit": "Unit of price (e.g. per Ton, per Bushel, per Quintal)",
      "historicalTrend": [
        { "month": "Jan", "price": 1550 },
        { "month": "Feb", "price": 1650 },
        ... (provide 6 months of historical data)
      ],
      "futureForecast": [
        { "month": "Jul", "price": 2050, "confidence": 92 },
        { "month": "Aug", "price": 2300, "confidence": 85 },
        ... (provide 6 months of future forecasting data)
      ],
      "demandForecast": "Brief, analytical summary of demand drivers and future direction",
      "bestTimeToSell": "Month range or specific timeframe with explanation of peak pricing",
      "nearbyMarkets": [
        { "market": "Name of market 1", "price": 1890, "distance": "12 miles" },
        { "market": "Name of market 2", "price": 1945, "distance": "34 miles" },
        ... (provide 3 nearby markets)
      ],
      "insights": ["Insight 1", "Insight 2", "Insight 3"]
    }
    Strictly output only valid, parseable JSON. Do not wrap in markdown or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = JSON.parse((response.text || "").trim());
    return res.json({ ...parsedData, isMocked: false });
  } catch (error) {
    console.error("Gemini market analysis failed:", error);
    const fallback = handleAiFallback("price-predictor", { cropName });
    return res.json({ ...fallback, isMocked: true, error: (error as any).message });
  }
});

// 5. Smart Irrigation & Water Management
app.post("/api/ai/irrigation", async (req, res) => {
  const { crop, soilMoisture, weatherForecast, waterSource } = req.body;
  if (!ai) {
    const fallback = handleAiFallback("irrigation", { crop, soilMoisture });
    return res.json({ ...fallback, isMocked: true });
  }

  try {
    const prompt = `You are a hydrologist and smart irrigation systems architect. Draft an intelligent water management plan:
    Crop Cultivated: ${crop || "Corn"}
    Soil Moisture: ${soilMoisture || 40}%
    Weather Forecast: ${weatherForecast || "Sunny, high temp, 0% rain"}
    Water Source Availability: ${waterSource || "Abundant canal water"}

    Predict water requirements, construct a weekly calendar schedule, suggest conservation measures, compute efficiency score, and trigger drought alerts if necessary.
    Provide your response STRICTLY as a JSON object with the following schema:
    {
      "waterRequirement": "Estimated volume required (e.g. 1800 Liters / Acre / Week)",
      "schedule": [
        { "day": "Monday", "action": "No Watering / Drip Irrigation / etc.", "amount": "0 L" },
        { "day": "Tuesday", "action": "Action description", "amount": "Amount in L" },
        ... (generate for all 7 days)
      ],
      "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
      "efficiencyScore": (water efficiency score out of 100 based on status),
      "droughtAlert": "Drought warning message or null if moisture is fine"
    }
    Strictly output only valid, parseable JSON. Do not wrap in markdown or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = JSON.parse((response.text || "").trim());
    return res.json({ ...parsedData, isMocked: false });
  } catch (error) {
    console.error("Gemini irrigation plan failed:", error);
    const fallback = handleAiFallback("irrigation", { crop, soilMoisture });
    return res.json({ ...fallback, isMocked: true, error: (error as any).message });
  }
});

// 6. Farm Business Dashboard (Financial Insights & Planning)
app.post("/api/ai/business-insights", async (req, res) => {
  const { income, expenses, cropInvestments, currentForecast } = req.body;
  if (!ai) {
    const fallback = handleAiFallback("business-insights", { income, expenses });
    return res.json({ ...fallback, isMocked: true });
  }

  try {
    const prompt = `You are a agricultural business strategist and CFO advisor. Analyze the finances of a commercial farm:
    Total Income: $${income || 25000}
    Total Expenses: $${expenses || 11000}
    Crop Investments: ${JSON.stringify(cropInvestments || [{ name: "Corn", cost: 4500 }, { name: "Tomato", cost: 6500 }])}
    Yield Forecast: ${currentForecast || "100% target expected"}

    Evaluate performance, write profit/loss summary, forecast yield revenues, and formulate business growth and optimization insights.
    Provide your response STRICTLY as a JSON object with the following schema:
    {
      "performanceScore": (overall business performance score out of 100, e.g. 84),
      "pAndLSummary": "Detailed textual breakdown of profit margin, expense leaks, and margin health",
      "yieldForecastInsight": "Strategic assessment of current harvest yield projections and monetary translation",
      "growthInsights": [
        "SaaS/Agritech growth suggestion 1",
        "SaaS/Agritech growth suggestion 2",
        "SaaS/Agritech growth suggestion 3"
      ],
      "investmentRecommendations": [
        "Recommendation for capital allocation 1",
        "Recommendation for capital allocation 2",
        "Recommendation for capital allocation 3"
      ]
    }
    Strictly output only valid, parseable JSON. Do not wrap in markdown or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = JSON.parse((response.text || "").trim());
    return res.json({ ...parsedData, isMocked: false });
  } catch (error) {
    console.error("Gemini financial planning failed:", error);
    const fallback = handleAiFallback("business-insights", { income, expenses });
    return res.json({ ...fallback, isMocked: true, error: (error as any).message });
  }
});

// --- VITE MIDDLEWARE SETUP ---
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static files serving from dist/ folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AgriNova AI Server] running on http://localhost:${PORT}`);
  });
};

startServer();
