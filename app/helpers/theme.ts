import Theme from '@nativescript-community/css-theme';
import { Application, Device, EventData, SystemAppearanceChangedEventData, Utils } from '@nativescript/core';
import { getBoolean, getString, setString } from '@nativescript/core/application-settings';
import { prefs } from '~/services/preferences';
import { showError } from '~/utils/error';
import { createGlobalEventListener, globalObservable } from '~/utils/svelte/ui';
import { updateThemeColors } from '~/variables';
import { lc } from '~/helpers/locale';
import { writable } from 'svelte/store';
import { SDK_VERSION } from '@nativescript/core/utils';
import { showAlertOptionSelect } from '~/utils/ui';
import { closePopover } from '@nativescript-community/ui-popover/svelte';
import { AppUtilsAndroid } from '@akylas/nativescript-app-utils';

export type Themes = 'auto' | 'light' | 'dark' | 'black';

export const onThemeChanged = createGlobalEventListener('theme');
export let theme: Themes;
if (__IOS__ && SDK_VERSION < 13) {
    theme = 'light';
} else {
    theme = getString('theme', DEFAULT_THEME) as Themes;
}
if (theme.length === 0) {
    theme = DEFAULT_THEME as Themes;
}
export const sTheme = writable('auto');
export const currentTheme = writable('auto');

let started = false;
let autoDarkToBlack = getBoolean('auto_black', false);
const ThemeBlack = 'black';

Application.on(Application.systemAppearanceChangedEvent, (event: SystemAppearanceChangedEventData) => {
    DEV_LOG && console.log('systemAppearanceChangedEvent', theme, event.newValue, autoDarkToBlack);
    if (theme === 'auto') {
        event.cancel = true;
        let realTheme = event.newValue as Themes;
        if (autoDarkToBlack && realTheme === 'dark') {
            realTheme = 'black';
        }
        if (__ANDROID__) {
            if (Application.android.startActivity) {
                AppUtilsAndroid.applyDayNight(Application.android.startActivity, true);
            }
        }
        Theme.setMode(Theme.Auto, undefined, realTheme, false);
        updateThemeColors(realTheme);
        //close any popover as they are not updating with theme yet
        closePopover();
        globalObservable.notify({ eventName: 'theme', data: realTheme });
    }
});

export function getThemeDisplayName(toDisplay = theme) {
    switch (toDisplay) {
        case 'auto':
            return lc('theme.auto');
        case 'dark':
            return lc('theme.dark');
        case 'black':
            return lc('theme.black');
        case 'light':
            return lc('theme.light');
    }
}

export function toggleTheme(autoDark = false) {
    const newTheme = theme === 'dark' ? (autoDark ? 'auto' : 'light') : 'dark';
    setString('theme', newTheme);
}
export async function selectTheme() {
    try {
        const actions: Themes[] = ['auto', 'light', 'dark', 'black'];
        const result = await showAlertOptionSelect(
            {
                height: Math.min(actions.length * 56, 400),
                rowHeight: 56,
                options: actions
                    .map((k) => ({ name: getThemeDisplayName(k), data: k }))
                    .map((d) => ({
                        ...d,
                        boxType: 'circle',
                        type: 'checkbox',
                        value: theme === d.data
                    }))
            },
            {
                title: lc('select_theme')
            }
        );
        if (result && actions.indexOf(result.data) !== -1) {
            setString('theme', result.data);
        }
    } catch (err) {
        showError(err);
    }
}

const AppCompatDelegate = __ANDROID__ ? androidx.appcompat.app.AppCompatDelegate : undefined;
export function applyTheme(theme: Themes) {
    try {
        DEV_LOG && console.log('applyTheme', theme);
        switch (theme) {
            case 'auto':
                Theme.setMode(Theme.Auto);
                if (__ANDROID__) {
                    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
                } else {
                    if (Application.ios.window) {
                        Application.ios.window.overrideUserInterfaceStyle = UIUserInterfaceStyle.Unspecified;
                    }
                }
                break;
            case 'light':
                Theme.setMode(Theme.Light);
                if (__ANDROID__) {
                    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
                } else {
                    if (Application.ios.window) {
                        Application.ios.window.overrideUserInterfaceStyle = UIUserInterfaceStyle.Light;
                    }
                }
                break;
            case 'dark':
                Theme.setMode(Theme.Dark);
                if (__ANDROID__) {
                    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
                } else {
                    if (Application.ios.window) {
                        Application.ios.window.overrideUserInterfaceStyle = UIUserInterfaceStyle.Dark;
                    }
                }
                break;
            case 'black':
                Theme.setMode(ThemeBlack);
                if (__ANDROID__) {
                    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
                } else {
                    if (Application.ios.window) {
                        Application.ios.window.overrideUserInterfaceStyle = UIUserInterfaceStyle.Dark;
                    }
                }
                break;
        }
    } catch (error) {
        console.error('applyTheme', error, error.stack);
    }
}

function getSystemAppearance() {
    if (typeof Application.systemAppearance === 'function') {
        return Application.systemAppearance();
    }

    return Application.systemAppearance;
}

export function getRealTheme(th = theme) {
    DEV_LOG && console.log('getRealTheme', th);
    if (th === 'auto') {
        try {
            th = getSystemAppearance() as any;
            if (autoDarkToBlack && th === 'dark') {
                th = 'black';
            }
        } catch (err) {
            console.error('getRealTheme', err, err.stack);
        }
    }
    return th;
}

export function isDarkTheme(th = getRealTheme(theme)) {
    return th === 'dark' || th === 'black';
}

export function getRealThemeAndUpdateColors() {
    const realTheme = getRealTheme(theme);
    updateThemeColors(realTheme);
}

export function start(force = false) {
    DEV_LOG && console.log('start theme helper', force, started);
    if (!force && started) {
        return;
    }
    started = true;

    prefs.on('key:auto_black', () => {
        autoDarkToBlack = getBoolean('auto_black');
        DEV_LOG && console.log('key:auto_black', theme, autoDarkToBlack);
        if (theme === 'auto') {
            const realTheme = getRealTheme(theme);
            currentTheme.set(realTheme);
            updateThemeColors(realTheme);
            globalObservable.notify({ eventName: 'theme', data: realTheme });
        }
    });

    prefs.on('key:theme', () => {
        let newTheme = getString('theme') as Themes;
        DEV_LOG && console.log('key:theme', theme, newTheme, autoDarkToBlack);
        if (__IOS__ && SDK_VERSION < 13) {
            newTheme = 'light';
        }
        // on pref change we are updating
        if (newTheme === theme) {
            return;
        }

        theme = newTheme;

        const realTheme = getRealTheme(newTheme);
        currentTheme.set(realTheme);

        applyTheme(newTheme);
        updateThemeColors(realTheme);
        sTheme.set(newTheme);
        if (__ANDROID__) {
            AppUtilsAndroid.applyDayNight(Application.android.startActivity, true);
        }
        setTimeout(() => {
            globalObservable.notify({ eventName: 'theme', data: realTheme });
        }, 0);
    });

    function onReady() {
        DEV_LOG && console.log('onReady', theme);
        applyTheme(theme);
        currentTheme.set(getRealTheme(theme));
        // updateThemeColors(realTheme);
    }
    if (__ANDROID__) {
        const context = Utils.android.getApplicationContext();
        if (context) {
            onReady();
        } else {
            Application.once(Application.launchEvent, onReady);
        }

        // we need to update the theme on every activity start
        // to get dynamic colors
        Application.android.on(Application.android.activityStartedEvent, (event) => {
            AppUtilsAndroid.applyDynamicColors(event.activity);
            getRealThemeAndUpdateColors();
        });
    } else {
        // without rootController systemAppearance will be null
        if (Application.ios?.rootController) {
            onReady();
        } else {
            Application.once(Application.initRootViewEvent, onReady);
        }
    }
}
