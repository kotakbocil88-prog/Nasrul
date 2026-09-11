import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/src/typography";
import { makeStyles, useTheme } from "@/src/theme";

type ToastKind = "success" | "error" | "info";
type ToastState = { message: string; kind: ToastKind } | null;

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const styles = useStyles();
  const { colors } = useTheme();

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      setToast({ message, kind });
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setToast(null),
        );
      }, 2600);
    },
    [anim],
  );

  const bg =
    toast?.kind === "success"
      ? colors.success
      : toast?.kind === "error"
        ? colors.error
        : colors.surfaceInverse;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          testID="toast"
          style={[
            styles.toast,
            {
              top: insets.top + 8,
              backgroundColor: bg,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const useStyles = makeStyles((colors) => ({
  toast: {
    position: "absolute",
    left: 12,
    right: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    zIndex: 9999,
  },
  toastText: {
    color: colors.onSurfaceInverse,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
}));

export const _styleRef = StyleSheet.create({});
