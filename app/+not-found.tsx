import { Link, Stack, usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  const pathname = usePathname();
  const segments = useSegments();
  useEffect(() => { console.info('NOT_FOUND_RENDER', JSON.stringify({ pathname, segments })); }, [pathname, segments]);
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
