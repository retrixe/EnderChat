import { StyleSheet } from 'react-native'

export default StyleSheet.create({
  outerView: { padding: 10 },
  iconStyle: { marginRight: 5 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    height: 37.5,
  },
  horizontalLine: {
    backgroundColor: '#666',
    marginBottom: 10,
    marginTop: 10,
    width: '100%',
    height: 1,
  },
  header: {
    padding: 10,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#bbb',
  },
  darkHeader: {
    padding: 10,
    flexDirection: 'row',
    backgroundColor: '#242424',
    borderBottomWidth: 1,
    borderBottomColor: '#121212',
  },
  iconButtonText: { color: 'white', fontWeight: '600' }, // backgroundColor: 'transparent'
  flexSpacer: { flex: 1 },
})
