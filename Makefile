include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-rm520n
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=pajus1337
PKG_LICENSE:=MIT

LUCI_TITLE:=RM520NGL Modem Manager
LUCI_DEPENDS:=+luci-base

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-rm520n/description
  LuCI panel for Quectel RM520NGL 5G modem management.
  Provides signal monitoring, band info, band locking,
  and AT command diagnostics via the Waveshare carrier board USB port.
endef

$(eval $(call BuildPackage,luci-app-rm520n))
