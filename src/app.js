import {div, input, h2, label, pre, code, makeDOMDriver} from '@cycle/dom'
import xs from 'xstream'
import { CycleDPicker } from './dpicker.cycle'

const container = document.getElementById('dpicker')

const dpicker = new DPicker(container, {hideOnOutsideClick: false, hideOnDayClick: false})

export function App (sources) {
  let valid = dpicker.valid

  const min = CycleDPicker({name: 'min'})
  const minVDom$ = min.DOM
  const max = CycleDPicker({name: 'max'})
  const maxVDom$ = max.DOM

  const validDpicker$ = xs.create({
    start: (listener) => {
      dpicker.onChange = function(d, modelChanged) {
        if (valid !== d.valid) {
          listener.next(d)
          valid = d
        }
      }
    },
    stop: () => {},
    id: 0
  })

  const form = [
    {
      key: 'display',
      default: true,
      label: 'Show'
    },
    {
      key: 'time',
      default: true,
      label: 'Time'
    },
    {
      key: 'concatHoursAndMinutes',
      default: false,
      label: 'Concat hours and minutes'
    },
    {
      key: 'step',
      default: dpicker.step,
      min: 1,
      max: 60,
      label: (value) =>`Step (${value})`
    },
    {
      key: 'meridiem',
      default: false,
      label: 'Meridiem'
    },
    {
      key: 'format',
      default: 'LL LTS',
      label: 'Format'
    },
    {
      key: 'valid',
      default: true,
      label: 'Valid',
      readonly: true
    }
  ]

  const formLength = form.length

  const form$ = form.map((e) => {
    e.value = e.default

    return sources.DOM.select(`input[name="${e.key}"]`)
    .events('input')
    .map(event => {
      switch(typeof e.default) {
        case 'boolean':
          e.value = event.target.checked
          break;
        default:
          e.value = event.target.value
          break;
      }

      return e
    })
    .startWith(e)
  })

  form$.push(validDpicker$.startWith(dpicker._data), minVDom$, maxVDom$)

  const vdom$ = xs.combine.apply(null, form$)
  .map((configArray) => {

    for (let i = 0; i < formLength; i++) {
      const param = configArray[i]

      if (param.readonly) {
        continue
      }

      if (dpicker[param.key] !== param.value) {
        dpicker[param.key] = param.value
      }
    }
  
    const minVDom = configArray[formLength + 1]
    const maxVDom = configArray[formLength + 2]

    if (minVDom.data.value && minVDom.data.value !== dpicker.min) {
      dpicker.min = minVDom.data.value
    }

    if (maxVDom.data.value && maxVDom.data.value !== dpicker.min) {
      dpicker.max = maxVDom.data.value
    }

    return {config: dpicker._data, minVDom: minVDom, maxVDom: maxVDom}
  })
  .map(({config, minVDom, maxVDom}) => {

    const childNodes = [
      h2('Date: ' + dpicker.model.format(dpicker.format))
    ]

    const booleanNodes = []
    const otherNodes = []

    for (let i = 0; i < formLength; i++) {
      const formItem = form[i]
      const value = config[formItem.key]
      const labelValue = typeof formItem.label === 'function' ? formItem.label(value) : formItem.label
      const readonly = formItem.readonly === undefined ? false : formItem.readonly

      let attrs

      switch(typeof formItem.default) {
        case 'boolean':
          booleanNodes.push(label('.checkbox-inline', [input({attrs: {name: formItem.key, checked: value, type: 'checkbox', readonly: readonly, disabled: readonly}}), labelValue]))
          continue
        case 'number':
          attrs = {name: formItem.key, value: value, type: 'range', min: formItem.min, max: formItem.max}
          break
        case 'string': 
          attrs = {name: formItem.key, value: value, type: 'text'}
          break
      }

      otherNodes.push(
        div('.col-md-6', [
          label({attrs: {for: formItem.key}}, labelValue), input('.form-control', {attrs: attrs})
        ])
      )
    }

    childNodes.push(
      div('.col-md-6', [
        div('.row', [div('.form-group', booleanNodes)]),
        div('.row', [div('.form-group', otherNodes)]),
        div('.row', [
          div('.form-group', [
            div('.col-md-6', [
              label({attrs: {for: 'min'}}, 'Minimum'), 
              minVDom
            ]),
            div('.col-md-6', [
              label({attrs: {for: 'max'}}, 'Maximum'), 
              maxVDom
            ])
          ])
        ])
      ])
    )

    const data = {}

    Object.keys(dpicker._data).filter((e) => !~['months', 'days', 'order', 'inputName', 'inputId'].indexOf(e)).forEach((e) => {
      data[e] = dpicker._data[e]
    })

    childNodes.push(
      pre(code(JSON.stringify(data, null, 2))),
    )

    return div('.row', childNodes)
  })

  return {
    DOM: vdom$
  };
}