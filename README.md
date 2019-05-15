# NodeBB AzureAD OAuth SSO 

NodeBB Plugin that allows users to login/register via Azure AD OAuth provider. 

## Register NodeBB application on Azure

1. Sign in to the [Azure portal](https://portal.azure.com/) using either a work or school account, or a personal Microsoft account.

1. If your account is present in more than one Azure AD tenant:
    - Select your profile from the menu on the top right corner of the page, and then **Switch directory**.
    - Change your session to the Azure AD tenant where you want to create your application.

1. Navigate to [Azure Active Directory > App registrations (Preview)](https://go.microsoft.com/fwlink/?linkid=2083908) to register your app.

1. Select **New registration.**

1. When the **Register an application** page appears, enter your app's registration information:
    - In the **Name** section, enter a meaningful name that will be displayed to users of the app. For example: NodeBB
    - In the **Supported account types** section, select **Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox, Outlook.com)**.

    If there are more than one redirect URIs, you'll need to add these from the **Authentication** tab later after the app has been successfully created.

1. Select **Register** to create the app.

1. On the app's **Overview** page, find the **Application (client) ID** value and record it for later. You'll need this value to configure the application later in this project.

1. In the list of pages for the app, select **Authentication**.
    - In the **Redirect URIs** section, select **Web** in the combo-box and enter the following redirect URI:
    `https://<nodebb-url>/auth/azuread/callback`
    - In the **Advanced settings** section, set **Logout URL** to `https://<nodebb-url>/logout`.
    - In the **Advanced settings > Implicit grant** section, check **ID tokens** as this sample requires the [Implicit grant flow](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-implicit-grant-flow) to be enabled to sign-in the user.

1. Select **Save**.

1. From the **Certificates & secrets** page, in the **Client secrets** section, choose **New client secret**.
    - Enter a key description (for instance app secret).
    - Select a key duration of either **In 1 year, In 2 years,** or **Never Expires**.
    - When you click the **Add** button, the key value will be displayed. Copy the key value and save it in a safe location.

    You'll need this key later to configure the application. This key value will not be displayed again, nor retrievable by any other means, so record it as soon as it is visible from the Azure portal.

## How to Install

1. Add the Azure OAuth credentials in config.js
1. Activate this plugin from the plugins page
1. Restart your NodeBB
1. Let NodeBB take care of the rest
