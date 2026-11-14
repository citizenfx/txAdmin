# Translation Support
txAdmin supports translation for over 30 languages for the in-game interface (menu/warn) and chat messages, as well as discord warnings.  


## Custom locales:
If your language is not available, or you want to customize the messages, create a `locale.json` file in inside the `txData` folder based on any language file found on [our repository](https://github.com/citizenfx/txAdmin/tree/master/locale). Then go to the settings and select the "Custom" language option.  
  
The `$meta.humanizer_language` key must be compatible with the library [humanize-duration](https://www.npmjs.com/package/humanize-duration), check their page for a list of compatible languages.


## Contributing:
We need the community help to translate, and keep the translations updated and high-quality.  
For that you will need to:
- Make a custom locale file with the instructions above;
- Name the file using the language code in [this page](https://www.science.co.il/language/Locale-codes.php);
- The `$meta.label` must be the language name in English (eg `Spanish` instead of `Español`);
- If you create a new translation, make sure to add it to `shared/localeMap.ts`, and maintain the alphabetical order;
- Do a [Pull Request](https://github.com/citizenfx/txAdmin/pulls) posting a few screenshots of evidence that you tested what you changed in-game.
- An automatic check will run, make sure to read the output in case of any errors.

> [!TIP]
> To quickly test your changes, you can edit the `locale.json` file and then in the settings page click "Save Global Settings" again to see the changes in the game menu without needing to restart txAdmin or the server.

> [!TIP]
> To make sure you didn't miss anything in the locale file, you can download the txAdmin source code, execute `npm i`, move the `locale.json` to inside the `txAdmin/locale` folder and run `npm run locale:check`. This will tell you about missing or extra keys.

> [!NOTE]
> The performance of custom locale for big servers may not be ideal due to the way we need to sync dynamic content to clients. So it is strongly encouraged that you contribute with translations in our GitHub so it gets packed with the rest of txAdmin.
