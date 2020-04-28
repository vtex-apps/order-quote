`📢 Use this project, [contribute](https://github.com/vtex-apps/orderquote) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).`

# ORDER QUOTE

This app provides **B2B** capabilities to save a Cart (Items, Quantities and Price) for further use, the user can also Print the quotation information containing the cart information along with expiration date which is defined at **Admin > Apps**.

![View Quotation](./image/view.png)

## Configuration

Install this app by running `vtex install vtex.orderquote`, after that, head over to the Admin `/admin/apps`, select **Order Quote**, now under the settings section, define the **Lifespan** and **Store logo URL**, click **Save**.

## What now?

This app will generate a few routes under the `/orderquote` path.

| Route                  | Description                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `/orderquote`          | List all saved quotations                                                              |
| `/orderquote/create`   | Creation page, this page will retrieve the current cart information                    |
| `/orderquote/view/:ID` | When you click to a quote at the listing page, you'll be redirected to the detail page |

## Customization

`In order to apply CSS customizations in this and other blocks, follow the instructions given in the recipe on [Using CSS Handles for store customization](https://vtex.io/docs/recipes/style/using-css-handles-for-store-customization).`

| CSS Handles               |
| ------------------------- |
| `containerList`           |
| `createButton`            |
| `inputCreate`             |
| `listContainer`           |
| `containerCreate`         |
| `inputCreate`             |
| `buttonsContainer`        |
| `checkboxClear`           |
| `buttonSave`              |
| `containerView`           |
| `buttonDelete`            |
| `buttonPrint`             |
| `buttonUse`               |
| `printingArea`            |
| `containerFields`         |
| `field`                   |
| `totalizerContainer`      |
| `logo`                    |
| `notAuthenticatedMessage` |

---

Check out some documentation models that are already live:

- [Order Quote](https://github.com/vtex-apps/orderquote)
- [Image](https://vtex.io/docs/components/general/vtex.store-components/image)
