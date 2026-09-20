//MoreStack
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../screens/more/MoreScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import MyCharactersScreen from "../screens/characters/MyCharactersScreen";
import GuildMembersScreen from "../screens/more/GuildMembersScreen";
import GuildMemberDetailScreen from "../screens/more/GuildMemberDetailScreen";
import BadgesScreen from "../screens/more/BadgesScreen";
import WorldRankingScreen from "../screens/more/WorldRankingScreen";
import SeasonHistoryScreen from "../screens/more/SeasonHistoryScreen";
import AdminPanelScreen from "../screens/more/AdminPanelScreen";

const Stack = createNativeStackNavigator();

export default function MoreStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MoreHome" component={MoreScreen} />
        <Stack.Screen name="ProfileHome" component={ProfileScreen} />
        <Stack.Screen name="MyCharacters" component={MyCharactersScreen} />
        <Stack.Screen name="GuildMembers" component={GuildMembersScreen} />
        <Stack.Screen name="GuildMemberDetail" component={GuildMemberDetailScreen} />
        <Stack.Screen name="Badges" component={BadgesScreen} />
        <Stack.Screen name="WorldRanking" component={WorldRankingScreen} />
        <Stack.Screen name="SeasonHistory" component={SeasonHistoryScreen} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        </Stack.Navigator>
    );
}