/**
 * The Bridge
 *
 * The bridge is responsible for handing communication from the server to the frontend.
 * Data should only be flowing server -> frontend.
 * As the architecture improves, the number of cross requires here should go down
 * Eventually, the aim is to make this a component that is initialised on boot and is either handed to or actively creates the frontend, if the frontend is desired.
 *
 * This file is a great place for all the cross-component event handling in lieu of refactoring
 */
const errors = require('@tryghost/errors');
const config = require('./shared/config');
const logging = require('./shared/logging');
const {events, i18n} = require('./server/lib/common');
const themeEngine = require('./frontend/services/theme-engine');

class Bridge {
    constructor() {
        /**
         * When locale changes, we reload theme translations
         * @deprecated: the term "lang" was deprecated in favour of "locale" publicly 4.0
         */
        events.on('settings.lang.edited', () => {
            this.getActiveTheme().initI18n();
        });
    }

    getActiveTheme() {
        return themeEngine.getActive();
    }

    activateTheme(loadedTheme, checkedTheme, error) {
        // no need to check the score, activation should be used in combination with validate.check
        // Use the two theme objects to set the current active theme
        try {
            let previousGhostAPI;

            if (this.getActiveTheme()) {
                previousGhostAPI = this.getActiveTheme().engine('ghost-api');
            }

            themeEngine.setActive(loadedTheme, checkedTheme, error);
            const currentGhostAPI = this.getActiveTheme().engine('ghost-api');

            if (previousGhostAPI !== undefined && (previousGhostAPI !== currentGhostAPI)) {
                events.emit('services.themes.api.changed');
                const siteApp = require('./server/web/site/app');
                siteApp.reload();
            }
        } catch (err) {
            logging.error(new errors.InternalServerError({
                message: i18n.t('errors.middleware.themehandler.activateFailed', {theme: loadedTheme.name}),
                err: err
            }));
        }
    }

    getFrontendApiVersion() {
        if (this.getActiveTheme()) {
            return this.getActiveTheme().engine('ghost-api');
        } else {
            return config.get('api:versions:default');
        }
    }
}

const bridge = new Bridge();

module.exports = bridge;
