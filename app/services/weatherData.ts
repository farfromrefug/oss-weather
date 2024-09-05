import { Align, Canvas, Cap, LayoutAlignment, Paint, StaticLayout, Style } from '@nativescript-community/ui-canvas';
import { ApplicationSettings, Color, Observable, verticalAlignmentProperty } from '@nativescript/core';
import { get } from 'svelte/store';
import { MIN_UV_INDEX } from '~/helpers/constants';
import { UNITS, convertValueToUnit, formatValueToUnit } from '~/helpers/formatter';
import type { CommonWeatherData, WeatherData } from '~/services/providers/weather';
import { createGlobalEventListener, globalObservable } from '~/utils/svelte/ui';
import { cloudyColor, fontScale, fonts, rainColor, scatteredCloudyColor, snowColor, sunnyColor } from '~/variables';
import { prefs } from './preferences';
import { getIndexedColor, tempColor } from '~/utils/utils';
import { PopoverOptions, showPopover } from '@nativescript-community/ui-popover/svelte';
import { HorizontalPosition, VerticalPosition } from '@nativescript-community/ui-popover';
import type HourlyPopover__SvelteComponent_ from '~/components/HourlyPopover.svelte';
import { ComponentProps } from 'svelte';
import { createNativeAttributedString } from '@nativescript-community/text';
import { iconService } from './icon';
import { lc } from '@nativescript-community/l';
import { colorForAqi } from './airQualityData';

export enum WeatherProps {
    precipAccumulation = 'precipAccumulation',
    precipProbability = 'precipProbability',
    cloudCover = 'cloudCover',
    cloudCeiling = 'cloudCeiling',
    uvIndex = 'uvIndex',
    windGust = 'windGust',
    moon = 'moon',
    windBeaufort = 'windBeaufort',
    temperature = 'temperature',
    temperatureMin = 'temperatureMin',
    temperatureMax = 'temperatureMax',
    snowDepth = 'snowDepth',
    snowfall = 'snowfall',
    iso = 'iso',
    iconId = 'iconId',
    windSpeed = 'windSpeed',
    windBearing = 'windBearing',
    rainSnowLimit = 'rainSnowLimit',
    aqi = 'aqi',
    sealevelPressure = 'sealevelPressure',
    apparentTemperature = 'apparentTemperature',
    relativeHumidity = 'relativeHumidity',
    dewpoint = 'dewpoint'
}

export const PROP_TO_UNIT = {
    [WeatherProps.windSpeed]: UNITS.Speed,
    [WeatherProps.windGust]: UNITS.Speed,
    [WeatherProps.temperature]: UNITS.Celcius,
    [WeatherProps.apparentTemperature]: UNITS.Celcius,
    [WeatherProps.temperatureMin]: UNITS.Celcius,
    [WeatherProps.temperatureMax]: UNITS.Celcius,
    [WeatherProps.dewpoint]: UNITS.Celcius,
    [WeatherProps.sealevelPressure]: UNITS.Pressure,
    [WeatherProps.iso]: UNITS.Distance,
    [WeatherProps.rainSnowLimit]: UNITS.Distance,
    [WeatherProps.cloudCover]: UNITS.Percent,
    [WeatherProps.uvIndex]: UNITS.UV,
    [WeatherProps.precipProbability]: UNITS.Percent,
    [WeatherProps.relativeHumidity]: UNITS.Percent,
    [WeatherProps.precipAccumulation]: UNITS.MM,
    [WeatherProps.snowDepth]: UNITS.CM,
    [WeatherProps.snowfall]: UNITS.CM,
    [WeatherProps.cloudCeiling]: UNITS.Distance
};

const UV_LEVEL_INDEXES = [0, 3, 6, 8, 11];
const UV_LEVEL_COLORS = ['#9BC600', '#FFBC03', '#FE8F00', '#F55023', '#9E47CC'];

export const DEFAULT_COMMON_WEATHER_DATA = '["windSpeed", "precipAccumulation", "cloudCover", "uvIndex", "windGust", "windBeaufort", "moon"]';

const arcPaint = new Paint();
arcPaint.style = Style.STROKE;
arcPaint.setTextAlign(Align.CENTER);
arcPaint.strokeCap = Cap.ROUND;

export const AVAILABLE_WEATHER_DATA = [
    WeatherProps.windSpeed,
    WeatherProps.precipAccumulation,
    WeatherProps.cloudCover,
    WeatherProps.uvIndex,
    WeatherProps.windGust,
    WeatherProps.moon,
    WeatherProps.snowDepth,
    WeatherProps.windBeaufort,
    WeatherProps.aqi,
    WeatherProps.apparentTemperature,
    WeatherProps.sealevelPressure,
    WeatherProps.relativeHumidity,
    WeatherProps.dewpoint,
    WeatherProps.iso,
    WeatherProps.rainSnowLimit
];
export const AVAILABLE_COMPARE_WEATHER_DATA = [
    WeatherProps.precipProbability,
    WeatherProps.windBearing,
    WeatherProps.windSpeed,
    WeatherProps.precipAccumulation,
    WeatherProps.cloudCover,
    WeatherProps.uvIndex,
    WeatherProps.windGust,
    WeatherProps.temperature,
    WeatherProps.apparentTemperature,
    WeatherProps.temperatureMin,
    WeatherProps.temperatureMax,
    WeatherProps.snowDepth,
    WeatherProps.snowfall,
    WeatherProps.iconId,
    WeatherProps.iso,
    WeatherProps.rainSnowLimit
];

export const onWeatherDataChanged = createGlobalEventListener('weatherData');

export const wiPaint = new Paint();
wiPaint.setTextAlign(Align.CENTER);
export const mdiPaint = new Paint();
mdiPaint.setTextAlign(Align.CENTER);
export const appPaint = new Paint();
appPaint.setTextAlign(Align.CENTER);

fonts.subscribe((data) => {
    if (data.wi?.length) {
        wiPaint.setFontFamily(data.wi);
        mdiPaint.setFontFamily(data.mdi);
        appPaint.setFontFamily(data.app);
    }
});

const WEATHER_DATA_ICONS = {
    [WeatherProps.moon]: (item: CommonWeatherData) => item.moonIcon,
    [WeatherProps.iconId]: 'mdi-theme-light-dark',
    [WeatherProps.sealevelPressure]: 'wi-barometer',
    [WeatherProps.relativeHumidity]: 'wi-humidity',
    [WeatherProps.dewpoint]: 'mdi-thermometer-water',
    [WeatherProps.apparentTemperature]: 'mdi-thermometer',
    [WeatherProps.temperature]: 'mdi-thermometer',
    [WeatherProps.rainSnowLimit]: 'app-rain-snow',
    [WeatherProps.iso]: 'mdi-snowflake-thermometer',
    [WeatherProps.cloudCover]: 'wi-cloud',
    [WeatherProps.windGust]: 'wi-strong-wind',
    [WeatherProps.uvIndex]: 'mdi-weather-sunny-alert',
    [WeatherProps.windBeaufort]: (item: CommonWeatherData) => item.windBeaufortIcon,
    [WeatherProps.windSpeed]: (item: CommonWeatherData) => item.windIcon,
    [WeatherProps.precipAccumulation]: (item: CommonWeatherData) => item.precipIcon
};

const WEATHER_DATA_TITLES = {
    [WeatherProps.iconId]: lc('weather_condition'),
    [WeatherProps.moon]: lc('moon'),
    [WeatherProps.cloudCover]: lc('cloud_cover'),
    [WeatherProps.windGust]: lc('wind_gust'),
    [WeatherProps.uvIndex]: lc('uv_index'),
    [WeatherProps.windBeaufort]: lc('wind_beaufort'),
    [WeatherProps.windSpeed]: lc('wind_speed'),
    [WeatherProps.rainSnowLimit]: lc('rain_snow_limit'),
    [WeatherProps.iso]: lc('freezing_level'),
    [WeatherProps.precipAccumulation]: lc('precipitation'),
    [WeatherProps.apparentTemperature]: lc('feels_like'),
    [WeatherProps.aqi]: lc('aqi'),
    [WeatherProps.sealevelPressure]: lc('sealevel_pressure'),
    [WeatherProps.dewpoint]: lc('dewpoint'),
    [WeatherProps.relativeHumidity]: lc('relative_humidity')
};
const WEATHER_DATA_COLORS = {
    [WeatherProps.moon]: '#845987',
    [WeatherProps.dewpoint]: '#0cafeb',
    [WeatherProps.relativeHumidity]: '#1e88e2',
    // [WeatherProps.apparentTemperature]: cloudyColor,
    [WeatherProps.cloudCover]: cloudyColor,
    [WeatherProps.windGust]: scatteredCloudyColor,
    [WeatherProps.windBeaufort]: scatteredCloudyColor,
    [WeatherProps.windSpeed]: scatteredCloudyColor,
    [WeatherProps.windBearing]: scatteredCloudyColor,
    // [WeatherProps.uvIndex]: scatteredCloudyColor,
    [WeatherProps.rainSnowLimit]: rainColor,
    [WeatherProps.iso]: snowColor,
    [WeatherProps.iconId]: sunnyColor,
    [WeatherProps.precipAccumulation]: rainColor,
    [WeatherProps.aqi]: colorForAqi(0)
};

export function getWeatherDataIcon(key: string) {
    let icon = WEATHER_DATA_ICONS[key];
    if (typeof icon === 'function') {
        icon = icon({ [key]: 0 });
    }
    return icon;
}
export function getWeatherDataTitle(key: string) {
    return WEATHER_DATA_TITLES[key] || key;
}
export function getWeatherDataColor(key: string) {
    return WEATHER_DATA_COLORS[key];
}
const ICONS_SIZE_FACTOR = {
    [WeatherProps.sealevelPressure]: 0.9,
    [WeatherProps.windSpeed]: 0.8,
    [WeatherProps.uvIndex]: 1,
    [WeatherProps.cloudCover]: 0.9,
    [WeatherProps.windGust]: 0.8,
    [WeatherProps.relativeHumidity]: 0.8,
    [WeatherProps.iso]: 0.9,
    [WeatherProps.rainSnowLimit]: 0.8
};

export interface CommonData {
    key: string;
    iconColor?: string | Color;
    color?: string | Color;
    textColor?: string | Color;
    backgroundColor?: string | Color;
    paint?: Paint;
    iconFontSize?: number;
    icon?: string;
    value?: string | number;
    subvalue?: string;
    customDraw?(canvas: Canvas, fontScale: number, paint: Paint, c: CommonData, x: number, y: number, ...args);
}
export interface CommonDataOptions {
    id: string;
    icon: string | ((item: CommonWeatherData) => string);
    iconFactor: number;
    // getData: (options: CommonDataOptions, item: CommonWeatherData) => any;
}

export function mergeWeatherData(mainData: WeatherData, ...addedDatas) {
    for (let index = 0; index < addedDatas.length; index++) {
        const addedData = addedDatas[index];
        Object.keys(addedData).forEach((k) => {
            const mainDataK = mainData[k]?.data || mainData[k];
            const addedDataK = addedData[k]?.data || addedData[k];
            if (!Array.isArray(mainDataK) && !Array.isArray(addedDataK)) {
                // DEV_LOG && console.log('mergeWeatherData object', k);
                Object.assign(mainDataK, addedDataK);
                return;
            }
            if (!mainDataK?.length || !addedDataK?.length) {
                return;
            }
            const originalFirstTime = mainDataK[0].time;
            const addedDataFirstTime = addedDataK[0].time;

            if (addedDataFirstTime >= originalFirstTime) {
                let index = mainDataK.findIndex((d) => d.time === addedDataFirstTime);
                if (index !== -1) {
                    for (index; index < mainDataK.length; index++) {
                        if (index < mainDataK.length && index < addedDataK.length && mainDataK[index].time === addedDataK[index].time) {
                            // DEV_LOG && console.log('assigning', k, index, addedDataK[index]);
                            Object.assign(mainDataK[index], addedDataK[index]);
                        }
                    }
                }
            } else {
                let index = addedDataK.findIndex((d) => d.time === originalFirstTime);
                if (index !== -1) {
                    for (index; index < addedDataK.length; index++) {
                        if (index < mainDataK.length && index < addedDataK.length && mainDataK[index].time === addedDataK[index].time) {
                            // DEV_LOG && console.log('assigning1', k, index, addedDataK[index]);
                            Object.assign(mainDataK[index], addedDataK[index]);
                        }
                    }
                }
            }
        });
    }
}

export class DataService extends Observable {
    minUVIndexToShow = MIN_UV_INDEX;
    constructor() {
        super();
        this.load();

        const setminUVIndexToShow = () => {
            this.minUVIndexToShow = ApplicationSettings.getNumber('min_uv_index', MIN_UV_INDEX);
        };
        setminUVIndexToShow();
        // prefs.on('key:common_data', this.load, this);
        prefs.on('key:min_uv_index', setminUVIndexToShow);
    }
    currentWeatherData: WeatherProps[] = [];
    currentSmallWeatherData: WeatherProps[] = [];
    allWeatherData: WeatherProps[] = [];

    getWeatherDataOptions(key: WeatherProps) {
        return {
            id: key,
            icon: WEATHER_DATA_ICONS[key],
            iconFactor: ICONS_SIZE_FACTOR[key] ?? 1
            // getData: this.getItemData
        };
    }
    updateCurrentWeatherData(data: WeatherProps[], smallData: WeatherProps[], save = true) {
        DEV_LOG && console.log('updateCurrentWeatherData', data, smallData);
        this.currentWeatherData = data;
        this.currentSmallWeatherData = smallData;
        this.allWeatherData = data.concat(smallData);
        // this.currentWeatherDataOptions = data.reduce((acc, key) => {
        //     acc[key] = {
        //         id: key,
        //         icon: WEATHER_DATA_ICONS[key],
        //         iconFactor: ICONS_SIZE_FACTOR[key] ?? 1
        //         // getData: this.getItemData
        //     };
        //     return acc;
        // }, {});
        if (save) {
            ApplicationSettings.setString('common_data', JSON.stringify(data));
            ApplicationSettings.setString('common_small_data', JSON.stringify(smallData));
            globalObservable.notify({ eventName: 'weatherData', data, smallData });
        }
    }
    load() {
        this.updateCurrentWeatherData(
            JSON.parse(ApplicationSettings.getString('common_data', '["windSpeed", "precipAccumulation", "cloudCover", "uvIndex", "windGust", "windBeaufort", "moon"]')),
            JSON.parse(ApplicationSettings.getString('common_small_data', '[]')),
            false
        );
    }
    isDataEnabled(key) {
        return this.allWeatherData.indexOf(key) !== -1;
    }

    getAllIconsData(item: CommonWeatherData, filter = [], addedBefore = [], addedAfter = []) {
        let keys = [...new Set(addedBefore.concat(this.allWeatherData).concat(addedAfter))];
        if (filter.length) {
            keys = keys.filter((k) => filter.indexOf(k) === -1);
        }
        return keys.map((k) => this.getItemData(k, item)).filter((d) => !!d);
    }
    getIconsData(item: CommonWeatherData, filter = [], addedBefore = [], addedAfter = []) {
        let keys = [...new Set(addedBefore.concat(this.currentWeatherData).concat(addedAfter))];
        if (filter.length) {
            keys = keys.filter((k) => filter.indexOf(k) === -1);
        }
        return keys.map((k) => this.getItemData(k, item)).filter((d) => !!d);
    }
    getSmallIconsData(item: CommonWeatherData, filter = [], addedBefore = [], addedAfter = []) {
        let keys = [...new Set(addedBefore.concat(this.currentSmallWeatherData).concat(addedAfter))];
        if (filter.length) {
            keys = keys.filter((k) => filter.indexOf(k) === -1);
        }
        return keys.map((k) => this.getItemData(k, item)).filter((d) => !!d);
    }

    getItemData(key: WeatherProps, item: CommonWeatherData, options = this.getWeatherDataOptions(key)): CommonData {
        if (!options || this.allWeatherData.indexOf(key) === -1 || !item.hasOwnProperty(key) || item[key] === null) {
            return null;
        }
        let icon: string = options.icon as any;
        if (typeof icon === 'function') {
            icon = (icon as Function)(item);
        }
        const iconFontSize = 20 * get(fontScale) * options.iconFactor;
        switch (key) {
            case WeatherProps.apparentTemperature:
                if (item.apparentTemperature) {
                    return {
                        key,
                        iconFontSize,
                        paint: mdiPaint,
                        icon,
                        value: formatWeatherValue(item, key),
                        subvalue: lc('apparent')
                    };
                }
                break;
            case WeatherProps.windSpeed:
                if (item.windSpeed) {
                    const data = convertWeatherValueToUnit(item, key);
                    return {
                        key,
                        iconFontSize,
                        paint: appPaint,
                        icon,
                        value: data[0],
                        subvalue: data[1]
                    };
                }
                break;
            case WeatherProps.temperature:
                // const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    iconColor: tempColor(item[key], -20, 30),
                    paint: mdiPaint,
                    icon,
                    value: formatWeatherValue(item, key)
                    // subvalue: data[1]
                };
            case WeatherProps.rainSnowLimit: {
                const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    iconColor: getWeatherDataColor(key),
                    paint: appPaint,
                    icon,
                    value: data[0],
                    subvalue: data[1]
                };
            }
            case WeatherProps.iso: {
                const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    iconColor: getWeatherDataColor(key),
                    paint: mdiPaint,
                    icon,
                    value: data[0],
                    subvalue: data[1]
                };
            }
            case WeatherProps.aqi:
                if (item.aqi) {
                    return {
                        key,
                        iconFontSize,
                        paint: mdiPaint,
                        color: item.aqiColor,
                        icon: 'mdi-leaf',
                        value: item.aqi,
                        subvalue: 'aqi'
                        // customDraw(canvas, fontScale, textPaint, item: CommonData, x, y, width) {
                        //     const size = (width * 2) / 3;
                        //     const arcY = y - size / 5;
                        //     const STROKE_WIDTH = 4 * fontScale;
                        //     const arcRect = new RectF(x - size / 2, arcY - size / 2, x + size / 2, arcY + size / 2);
                        //     const delta = 180 - 45 + STROKE_WIDTH / 2;
                        //     arcPaint.setStrokeWidth(STROKE_WIDTH);
                        //     arcPaint.color = new Color(colorForAqi(item.value));
                        //     arcPaint.setAlpha(100);
                        //     canvas.drawArc(arcRect, 0 + delta, 270 - STROKE_WIDTH, false, arcPaint);
                        //     arcPaint.setAlpha(255);
                        //     canvas.drawArc(arcRect, 0 + delta, ((item.value as number) / 400) * (270 - STROKE_WIDTH), false, arcPaint);

                        //     // textPaint.setColor(colorForAqi(item.aqi));
                        //     textPaint.setTextSize(14 * fontScale);
                        //     canvas.drawText(item.value + '', x, arcY + (size * 1) / 5, textPaint);

                        //     textPaint.setTextSize(12 * fontScale);
                        //     // textPaint.setColor(item.color || colorOnSurface);
                        //     canvas.drawText(item.subvalue + '', x, y + 19 * fontScale, textPaint);
                        // }
                    };
                }
                break;
            case WeatherProps.precipAccumulation:
                if ((item.precipProbability === -1 || item.precipProbability > 10) && item.precipAccumulation >= 0.1) {
                    return {
                        key,
                        paint: item.precipFontUseApp ? appPaint : wiPaint,
                        color: item.precipColor,
                        iconFontSize,
                        icon: item.precipIcon,
                        value: formatValueToUnit(item.precipAccumulation, item.precipUnit),
                        subvalue: item.precipProbability > 0 && formatWeatherValue(item, WeatherProps.precipProbability)
                    };
                }
                break;

            case WeatherProps.cloudCover:
                if (item.cloudCover > 20) {
                    return {
                        key,
                        paint: wiPaint,
                        color: item.cloudColor,
                        iconFontSize,
                        icon,
                        value: formatWeatherValue(item, key),
                        subvalue: item.cloudCeiling && formatWeatherValue(item, WeatherProps.cloudCeiling)
                    };
                }
                break;
            case WeatherProps.uvIndex:
                if (item.uvIndex >= this.minUVIndexToShow) {
                    return {
                        key,
                        paint: mdiPaint,
                        color: item.uvIndexColor,
                        iconFontSize,
                        icon,
                        value: convertWeatherValueToUnit(item, key)[0]
                        // subvalue: 'uv'
                    };
                }
                break;
            case WeatherProps.windGust:
                if (item.windGust && (!item.windSpeed || (item.windGust > 30 && item.windGust > 2 * item.windSpeed))) {
                    const data = convertWeatherValueToUnit(item, key);
                    return {
                        key,
                        iconFontSize,
                        paint: wiPaint,
                        backgroundColor: item.windGust > 80 ? '#ff0353' : item.windGust > 50 ? '#FFBC03' : undefined,
                        color: item.windGust > 80 ? '#ffffff' : item.windGust > 50 ? '#222' : '#FFBC03',
                        icon,
                        value: data[0],
                        subvalue: data[1],
                        customDraw(canvas: Canvas, fontScale: number, textPaint: Paint, data: CommonData, x: number, y: number, withIcon = false) {
                            textPaint.setTextSize(11 * fontScale);
                            textPaint.setColor(data.color);
                            const staticLayout = new StaticLayout(
                                withIcon
                                    ? createNativeAttributedString(
                                          {
                                              spans: [
                                                  {
                                                      fontFamily: data.paint.fontFamily,
                                                      fontSize: data.iconFontSize * 0.9,
                                                      color: data.color,
                                                      text: data.icon,
                                                      verticalAlignment: 'center'
                                                  },
                                                  {
                                                      text: ` ${data.value} ${data.subvalue}`,
                                                      verticalAlignment: 'center'
                                                  }
                                              ]
                                          },
                                          null
                                      )
                                    : `${data.value} ${data.subvalue}`,
                                textPaint,
                                canvas.getWidth(),
                                LayoutAlignment.ALIGN_NORMAL,
                                1,
                                0,
                                false
                            );

                            canvas.save();
                            let result = 0;
                            switch (textPaint.getTextAlign()) {
                                case Align.CENTER:
                                    canvas.translate(x, y);
                                    break;
                                case Align.LEFT:
                                    canvas.translate(x + 4, y);
                                    break;
                                case Align.RIGHT:
                                    canvas.translate(x - 4, y);
                                    break;
                            }
                            const width = staticLayout.getLineWidth(0);
                            if (data.backgroundColor) {
                                const oldColor = textPaint.getColor();
                                // this fixes a current issue with the Paint getDrawTextAttribs is set on Paint in getHeight
                                // if we change the paint color to draw the rect
                                // then if we do it too soon the paint getDrawTextAttribs is going to use that new
                                // color and thus we loose the color set before for the text
                                const height = staticLayout.getHeight();
                                textPaint.setColor(data.backgroundColor);
                                switch (textPaint.getTextAlign()) {
                                    case Align.CENTER:
                                        canvas.drawRoundRect(-width / 2 - 4, -1, width / 2 + 4, height - 0, 4, 4, textPaint);
                                        break;
                                    case Align.LEFT:
                                        canvas.drawRoundRect(-4, -1, width + 4, height - 0, 4, 4, textPaint);
                                        break;
                                    case Align.RIGHT:
                                        canvas.drawRoundRect(-width - 4, -1, -4, height - 0, 4, 4, textPaint);
                                        break;
                                }
                                textPaint.setColor(oldColor);
                            }
                            result = width + 16;

                            staticLayout.draw(canvas);
                            canvas.restore();
                            return result;
                        }
                    };
                }
                break;

            case WeatherProps.dewpoint: {
                // const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    paint: mdiPaint,
                    value: formatWeatherValue(item, key),
                    icon
                    // value: data[0],
                    // subvalue: data[1]
                };
            }

            case WeatherProps.relativeHumidity: {
                // const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    paint: wiPaint,
                    icon,
                    value: formatWeatherValue(item, key)
                    // subvalue: data[1]
                };
            }
            case WeatherProps.sealevelPressure: {
                const data = convertWeatherValueToUnit(item, key);
                return {
                    key,
                    iconFontSize,
                    paint: wiPaint,
                    icon,
                    // value: formatWeatherValue(item, key),
                    value: data[0],
                    subvalue: data[1]
                };
            }
            case WeatherProps.moon:
                return {
                    key,
                    paint: wiPaint,
                    iconFontSize,
                    icon,
                    color: getWeatherDataColor(key),
                    value: lc('moon')
                };
            case WeatherProps.windBeaufort:
                if (item.windBeaufortIcon) {
                    return {
                        key,
                        paint: wiPaint,
                        iconFontSize,
                        icon
                    };
                }
                break;
            default:
                break;
        }
    }
}
export const weatherDataService = new DataService();

export async function showHourlyPopover(
    item: CommonWeatherData,
    props?: Partial<ComponentProps<HourlyPopover__SvelteComponent_>>,
    options?: Partial<PopoverOptions<ComponentProps<HourlyPopover__SvelteComponent_>>>
) {
    const HourlyPopover = (await import('~/components/HourlyPopover.svelte')).default;
    await showPopover({
        view: HourlyPopover,
        vertPos: VerticalPosition.ALIGN_TOP,
        horizPos: HorizontalPosition.ALIGN_LEFT,
        focusable: false,
        hideArrow: true,
        props: {
            item,
            ...(props || {})
        },
        ...(options || {})
    });
}

export function convertWeatherValueToUnit(item: CommonWeatherData, key: string, options?: { prefix?: string; join?: string; unitScale?: number; roundedTo05?: boolean; round?: boolean }) {
    return convertValueToUnit(item[key], PROP_TO_UNIT[key], options);
}
export function formatWeatherValue(item: CommonWeatherData, key: string, options?: { prefix?: string; join?: string; unitScale?: number; roundedTo05?: boolean }) {
    if (key === WeatherProps.iconId) {
        return iconService.getIcon(item.iconId, item.isDay, false);
    }
    return formatValueToUnit(item[key], PROP_TO_UNIT[key], options);
}

export function colorForUV(value) {
    return getIndexedColor(value, UV_LEVEL_INDEXES, UV_LEVEL_COLORS);
    // if (uvIndex >= 11) {
    //     return '#9E47CC';
    // } else if (uvIndex >= 8) {
    //     return '#F55023';
    // } else if (uvIndex >= 6) {
    //     return '#FE8F00';
    // } else if (uvIndex >= 3) {
    //     return '#FFBC03';
    // } else {
    //     return '#9BC600';
    // }
}
