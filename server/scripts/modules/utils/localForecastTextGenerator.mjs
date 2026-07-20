import { directionToNSEW } from './calc.mjs';

import ConversionHelpers from './conversionHelpers.mjs';

function generateLocalForecast(dateStamp, hourlyData) {
	const MORNING_HOURS = [...Array(12).keys()].map((h) => h + 6); // 6 AM - 6 PM
	const NIGHT_HOURS = [...Array(6).keys()].map((h) => h + 18).concat([...Array(6).keys()]); // 6 PM - 6 AM

	const phraseVariations = {
		'CHANCE OF PRECIPITATION': [
			'PROBABILITÀ DI PRECIPITAZIONI',
			'POSSIBILI ROVESCI',
			'PRECIPITAZIONALI POSSIBILI',
			'RISCHIO DI PIOGGIA',
			'ROVESCI ATTESI',
			'PIOGGIA PROBABILE',
		],
		WIND: [
			'VENTI DA',
			'VENTI PROVENIENTI DA',
			'BREZZE DA',
			'BREZZE PROVENIENTI DA',
			'RAFFICHE DA',
			'SOFFI DA',
		],
		CLOUDY: [
			'CIELO MOLTO NUVOLOSO',
			'PREVALENZA DI NUBI',
			'CIELO COPERTO',
			'NUVOLOSITÀ VARIABILE',
			'MOLTO NUVOLOSO CON SCHIARITE',
			'NUBI PROTAGONISTE',
		],
		CLEAR: [
			'CIELO IN PREVALENZA SERENO',
			'POCHE NUBI IN ARRIVO',
			'CIELO SERENO',
			'SERENO O POCO NUVOLOSO',
			'AMPI SBALZI DI SOLE',
			'SCARSA NUVOLOSITÀ',
		],
		'SNOW SHOWERS': [
			'POSSIBILI NEVICATE',
			'NEVE PREVISTA',
			'NEVISCHIO POSSIBILE',
		],
	};

	const forecastTemplates = [
		'{period}... {cloudCover}, CON {tempLabel} INTORNO A {temp}. {windInfo}. {precipChance}',
		'{period}... {cloudCover}, {tempLabel} VICINA A {temp}. {windInfo}. {precipChance}',
		'{period}... {cloudCover}, {tempLabel} PROSSIMA A {temp}. {windInfo}. {precipChance}',
		'{cloudCover} QUESTO {period}, CON {tempLabel} INTORNO A {temp}. {windInfo}. {precipChance}',
		'PREVISIONI PER {period}: {cloudCover}, {tempLabel} {temp}. {windInfo}. {precipChance}',
		'PROSPETTIVA PER {period}: {cloudCover}, ATTESA {tempLabel} INTORNO A {temp}. {windInfo}. {precipChance}',
		'METEO PER {period}: {cloudCover}, {tempLabel} SU {temp}. {windInfo}. {precipChance}',
		'{period}... {cloudCover}, {tempLabel} SUI {temp}. {windInfo}. {precipChance}',
		'{period}... {tempLabel} VICINA A {temp}. {cloudCover}. {windInfo}. {precipChance}',
		'{period}... {cloudCover}. {windInfo}. {precipChance} {tempLabel} INTORNO A {temp}.',
		'PREVISIONI PER {period}: {cloudCover}, CON TEMPERATURE ATTORNO A {temp}. {windInfo}. {precipChance}',
		'SITUAZIONE {period}: {cloudCover}. {windInfo}. {precipChance} TEMPERATURE PREVISTE ATTORNO A {temp}.',
	];

	function getMostFrequent(arr) {
		return arr.sort((a, b) => arr.filter((v) => v === a).length - arr.filter((v) => v === b).length).pop();
	}

	// eslint-disable-next-line no-shadow
	function processForecast(hourlyData, period) {
		const periodData = hourlyData.filter((entry) => (period === 'MATTINA' ? MORNING_HOURS : NIGHT_HOURS).includes(new Date(entry.time).getHours()));

		if (!periodData.length) return null;

		const temps = periodData.map((entry) => ConversionHelpers.convertTemperatureUnits(Math.round(entry.temperature_2m)));
		const temp = period === 'MATTINA' ? Math.max(...temps) : Math.min(...temps);
		const tempLabel = period === 'MATTINA' ? 'MASSIMA' : 'MINIMA';

		const windSpeeds = periodData.map((entry) => ConversionHelpers.convertWindUnits(Math.round(entry.wind_speed_10m)));
		const windDirs = periodData.map((entry) => entry.wind_direction_10m);
		const windInfo = `VENTO DA ${directionToNSEW(getMostFrequent(windDirs))} DA ${Math.min(...windSpeeds)} A ${Math.max(...windSpeeds)} ${ConversionHelpers.getWindUnitText().toUpperCase()}`;

		const precipProbs = periodData.map((entry) => entry.precipitation_probability);
		const maxPrecip = Math.max(...precipProbs);
		let precipChance = 'PRECIPITAZIONI NON PREVISTE.';

		if (maxPrecip >= 30) {
			const peakHour = periodData.find((entry) => entry.precipitation_probability === maxPrecip)?.time;
			const hour = new Date(peakHour).getHours();
			const precipTime = `DOPO LE ${hour.toString().padStart(2, '0')}:00`;
			precipChance = `${phraseVariations['CHANCE OF PRECIPITATION'][Math.floor(Math.random() * phraseVariations['CHANCE OF PRECIPITATION'].length)]} ${precipTime}. PROBABILITÀ DEL ${maxPrecip}%.`;
		}

		const cloudCover = periodData.map((entry) => entry.cloud_cover);
		const averagedCloudCover = Math.max(...cloudCover);
		let cloudCoverText = '';

		if (averagedCloudCover >= 0 && averagedCloudCover < 20) {
			cloudCoverText = phraseVariations.CLEAR[Math.floor(Math.random() * 3)];
		} else if (averagedCloudCover >= 20 && averagedCloudCover < 50) {
			cloudCoverText = phraseVariations.CLEAR[Math.floor(Math.random() * 3)];
		} else if (averagedCloudCover >= 50 && averagedCloudCover < 80) {
			cloudCoverText = phraseVariations.CLOUDY[Math.floor(Math.random() * 3)];
		} else {
			cloudCoverText = phraseVariations.CLOUDY[Math.floor(Math.random() * 3)];
		}

		const forecastText = forecastTemplates[Math.floor(Math.random() * forecastTemplates.length)]
			.replace('{period}', period)
			.replace('{cloudCover}', cloudCoverText)
			.replace('{tempLabel}', tempLabel)
			.replace('{temp}', temp)
			.replace('{windInfo}', windInfo)
			.replace('{precipChance}', precipChance)
			.replace(/\n/g, '')
			.replace(/\r/g, '');

		return {
			period,
			temperature: { label: tempLabel, value: temp },
			wind: windInfo,
			precipitation: precipChance,
			skyCondition: cloudCover,
			text: forecastText,
		};
	}

	// Generate forecast for the provided date
	const dayDate = new Date(dateStamp);
	const dayStr = dayDate.toLocaleDateString('it-IT', { weekday: 'long' }).toUpperCase();

	const dailyData = hourlyData.filter((entry) => new Date(entry.time).toDateString() === dayDate.toDateString());

	const morningForecast = processForecast(dailyData, 'MATTINA');
	const nightForecast = processForecast(dailyData, 'NOTTE');

	const forecast = {
		date: dayStr,
		periods: {
			morning: morningForecast,
			night: nightForecast,
		},
	};

	return JSON.stringify(forecast, null, 2);
}

export {
	// eslint-disable-next-line import/prefer-default-export
	generateLocalForecast,
};
