//HomeStack:
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/home/HomeScreen";
import CreateInvitationScreen from "../screens/invitation/CreateInvitationScreen";
import InvitationDetailScreen from "../screens/invitation/InvitationDetailScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="CreateInvitation" component={CreateInvitationScreen} />
      <Stack.Screen name="InvitationDetail" component={InvitationDetailScreen} />
    </Stack.Navigator>
  );
}
