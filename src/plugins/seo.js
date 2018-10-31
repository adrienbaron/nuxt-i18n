export default ({app}) => {
  app.router.beforeEach((to, from, next) => {
    if (!to.matched.length) {
      next()
      return
    }

    let val;
    const matched = to.matched[to.matched.length - 1]
    Object.defineProperty(matched.instances, "default", {
      configurable: true,
      enumerable: true,
      get() {
        return val
      },
      set(pageComponent) {
        val = pageComponent;
        if (pageComponent) {
          const root = findNuxtRootComponent(pageComponent)
          if (root) {
            injectMetaOnRoot(root)
          }
        }
      }
    })
    next()
  })
}

function findNuxtRootComponent(component) {
  if (component.$options.name !== 'nuxt') {
    if (component.$parent) {
      return findNuxtRootComponent(component.$parent)
    }
    console.warn("Couldn't find Nuxt root component in Nuxt i18n")
    return null
  }

  return component
}

function injectMetaOnRoot(root) {
  if (root.$options._nuxtSeoIsSet) {
    return
  }

  root.$options._nuxtSeoIsSet = true
  root._hasMetaInfo = true
  Object.defineProperty(root.$options, "head", {
    configurable: true,
    enumerable: true,
    get() {
      return nuxtSeoHead.apply(root)
    },
    set(newValue) {}
  })
}

function nuxtSeoHead() {
  const COMPONENT_OPTIONS_KEY = '<%= options.COMPONENT_OPTIONS_KEY %>'
  if (
    !this.$i18n ||
    !this.$i18n.locales ||
    this.$options[COMPONENT_OPTIONS_KEY] === false ||
    (this.$options[COMPONENT_OPTIONS_KEY] && this.$options[COMPONENT_OPTIONS_KEY].seo === false)
  ) {
    return {};
  }
  const LOCALE_CODE_KEY = '<%= options.LOCALE_CODE_KEY %>'
  const LOCALE_ISO_KEY = '<%= options.LOCALE_ISO_KEY %>'
  const BASE_URL = '<%= options.baseUrl %>'

  // Prepare html lang attribute
  const currentLocaleData = this.$i18n.locales.find(l => l[LOCALE_CODE_KEY] === this.$i18n.locale)
  const htmlAttrs = {}
  if (currentLocaleData && currentLocaleData[LOCALE_ISO_KEY]) {
    htmlAttrs.lang = currentLocaleData[LOCALE_ISO_KEY]
  }

  // hreflang tags
  const link = this.$i18n.locales
  .map(locale => {
    if (locale[LOCALE_ISO_KEY]) {
      return {
        hid: 'alternate-hreflang-' + locale[LOCALE_ISO_KEY],
        rel: 'alternate',
        href: BASE_URL + this.switchLocalePath(locale.code),
        hreflang: locale[LOCALE_ISO_KEY]
      }
    } else {
      console.warn('[<%= options.MODULE_NAME %>] Locale ISO code is required to generate alternate link')
      return null
    }
  })
  .filter(item => !!item)

  // og:locale meta
  const meta = []
  // og:locale - current
  if (currentLocaleData && currentLocaleData[LOCALE_ISO_KEY]) {
    meta.push({
      hid: 'og:locale',
      name: 'og:locale',
      property: 'og:locale',
      // Replace dash with underscore as defined in spec: language_TERRITORY
      content: currentLocaleData[LOCALE_ISO_KEY].replace(/-/g, '_')
    })
  }
  // og:locale - alternate
  meta.push(
    ...this.$i18n.locales
    .filter(l => l[LOCALE_ISO_KEY] && l[LOCALE_ISO_KEY] !== currentLocaleData[LOCALE_ISO_KEY])
    .map(locale => ({
      hid: 'og:locale:alternate-' + locale[LOCALE_ISO_KEY],
      name: 'og:locale:alternate',
      property: 'og:locale:alternate',
      content: locale[LOCALE_ISO_KEY].replace(/-/g, '_')
    }))
  );

  return {
    htmlAttrs,
    link,
    meta
  }
}
